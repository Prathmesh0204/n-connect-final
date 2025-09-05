from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import os
import uuid
import qrcode
from io import BytesIO
from django.core.files import File
from PIL import Image


def validate_image_file(value):
    """Validate uploaded image files"""
    if value.size > 5 * 1024 * 1024:  # 5MB limit
        raise ValidationError('File size cannot exceed 5MB')

    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in valid_extensions:
        raise ValidationError('Only JPG, JPEG, PNG, GIF, and WebP files are allowed')
    return value


def validate_phone_number(value):
    """Validate Indian phone numbers"""
    if not (value.isdigit() and len(value) == 10):
        raise ValidationError('Enter a valid 10-digit phone number')


def complaint_image_path(instance, filename):
    """Generate file path for complaint images"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"complaints/{instance.id}/{filename}"


def user_avatar_path(instance, filename):
    """Generate file path for user avatars"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{ext}"
    return f"avatars/{instance.user.id}/{filename}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(
        max_length=15,
        validators=[validate_phone_number],
        blank=True, null=True
    )
    avatar = models.ImageField(
        upload_to=user_avatar_path,
        validators=[validate_image_file],
        blank=True, null=True
    )
    bio = models.TextField(max_length=500, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    emergency_contact = models.CharField(max_length=15, blank=True)
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    force_password_change = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    account_locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Resize avatar if too large
        if self.avatar:
            img = Image.open(self.avatar)
            if img.height > 300 or img.width > 300:
                img.thumbnail((300, 300))
                img.save(self.avatar.path)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} - Profile"

    class Meta:
        db_table = 'user_profiles'


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


class Flat(models.Model):
    flat_number = models.CharField(max_length=10, unique=True, db_index=True)
    owner = models.ForeignKey(
        User,
        related_name='owned_flats',
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    tenants = models.ManyToManyField(User, related_name='rented_flats', blank=True)
    floor = models.PositiveIntegerField(validators=[MinValueValidator(0)], null=True, blank=True)
    area_sqft = models.PositiveIntegerField(null=True, blank=True)
    bedrooms = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    bathrooms = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    building = models.CharField(max_length=50, blank=True)
    is_occupied = models.BooleanField(default=False)
    monthly_rent = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    lease_start_date = models.DateField(null=True, blank=True)
    lease_end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Flat {self.flat_number}"

    @property
    def current_occupants(self):
        """Get all current occupants (owner + tenants)"""
        occupants = []
        if self.owner:
            occupants.append(self.owner)
        occupants.extend(self.tenants.all())
        return occupants

    class Meta:
        db_table = 'flats'
        ordering = ['flat_number']


class FlatAssignment(models.Model):
    """Track flat assignments history"""
    ASSIGNMENT_TYPES = [
        ('owner', 'Owner'),
        ('tenant', 'Tenant'),
    ]

    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='assignments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='flat_assignments')
    assignment_type = models.CharField(max_length=10, choices=ASSIGNMENT_TYPES)
    assigned_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_flats')
    assigned_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.flat.flat_number} - {self.user.username} ({self.assignment_type})"

    class Meta:
        db_table = 'flat_assignments'
        unique_together = ['flat', 'user', 'assignment_type']


class TenantRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ]

    tenant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tenant_requests')
    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='tenant_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='processed_tenant_requests',
        null=True, blank=True
    )
    admin_notes = models.TextField(blank=True)

    def __str__(self):
        return f"Request: {self.tenant.username} → {self.flat.flat_number}"

    class Meta:
        db_table = 'tenant_requests'
        unique_together = ['tenant', 'flat']


class Vehicle(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('two_wheeler', 'Two Wheeler'),
        ('car', 'Car'),
        ('suv', 'SUV'),
        ('truck', 'Truck'),
        ('other', 'Other')
    ]

    vehicle_number_validator = RegexValidator(
        regex=r'^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$',
        message='Enter valid vehicle number (e.g., MH12AB1234)'
    )

    resident = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_number = models.CharField(
        max_length=20,
        unique=True,
        validators=[vehicle_number_validator],
        db_index=True
    )
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='car')
    brand = models.CharField(max_length=50, blank=True)
    model = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=30, blank=True)
    year_of_manufacture = models.PositiveIntegerField(null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    pollution_certificate_expiry = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    parking_slot = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.vehicle_number = self.vehicle_number.upper().replace(' ', '')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.vehicle_number} ({self.get_vehicle_type_display()}) - {self.resident.username}"

    class Meta:
        db_table = 'vehicles'
        ordering = ['-created_at']


class Complaint(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent')
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed')
    ]

    CATEGORY_CHOICES = [
        ('maintenance', 'Maintenance'),
        ('plumbing', 'Plumbing'),
        ('electrical', 'Electrical'),
        ('security', 'Security'),
        ('noise', 'Noise Complaint'),
        ('parking', 'Parking'),
        ('elevator', 'Elevator'),
        ('cleaning', 'Cleaning'),
        ('other', 'Other'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints')
    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='complaints')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    image = models.ImageField(
        upload_to=complaint_image_path,
        validators=[validate_image_file],
        blank=True, null=True
    )
    location = models.CharField(max_length=200, blank=True)
    admin_response = models.TextField(blank=True)
    estimated_resolution_date = models.DateField(null=True, blank=True)
    actual_resolution_date = models.DateField(null=True, blank=True)
    satisfaction_rating = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    satisfaction_feedback = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='resolved_complaints',
        null=True, blank=True
    )

    def __str__(self):
        return f"{self.title} - {self.flat.flat_number}"

    @property
    def is_overdue(self):
        if self.estimated_resolution_date and self.status not in ['resolved', 'closed']:
            return timezone.now().date() > self.estimated_resolution_date
        return False

    class Meta:
        db_table = 'complaints'
        ordering = ['-created_at']


class MaintenanceBill(models.Model):
    STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('partial', 'Partial Payment')
    ]

    BILL_TYPE_CHOICES = [
        ('maintenance', 'Maintenance'),
        ('electricity', 'Electricity'),
        ('water', 'Water'),
        ('gas', 'Gas'),
        ('internet', 'Internet'),
        ('parking', 'Parking'),
        ('other', 'Other')
    ]

    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='bills')
    bill_type = models.CharField(max_length=20, choices=BILL_TYPE_CHOICES, default='maintenance')
    bill_month = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])
    bill_year = models.PositiveIntegerField(validators=[MinValueValidator(2020)])
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    previous_reading = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    current_reading = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    units_consumed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rate_per_unit = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    due_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='unpaid')
    description = models.TextField(blank=True)
    late_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_screenshot = models.ImageField(
        upload_to='payments/',
        validators=[validate_image_file],
        blank=True, null=True
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=[
            ('upi', 'UPI'),
            ('bank_transfer', 'Bank Transfer'),
            ('cash', 'Cash'),
            ('cheque', 'Cheque'),
            ('online', 'Online Payment')
        ],
        blank=True, null=True
    )
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='verified_bills',
        null=True, blank=True
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_amount(self):
        return self.amount + self.late_fee - self.discount

    @property
    def is_overdue(self):
        return timezone.now().date() > self.due_date and self.status == 'unpaid'

    def __str__(self):
        return f"Bill: {self.flat.flat_number} - {self.bill_month:02d}/{self.bill_year}"

    class Meta:
        db_table = 'maintenance_bills'
        unique_together = ['flat', 'bill_month', 'bill_year', 'bill_type']
        ordering = ['-created_at']


class CameraAccessRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired')
    ]

    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='camera_requests')
    flat = models.ForeignKey(Flat, on_delete=models.CASCADE, related_name='camera_requests')
    reason = models.TextField()
    requested_date = models.DateField()
    # ✅ FIX: This field is now optional in the database.
    requested_time = models.TimeField(null=True, blank=True)
    duration_hours = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(24)])
    camera_location = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    approval_details = models.TextField(blank=True, null=True)
    access_link = models.URLField(blank=True, null=True)
    qr_code = models.ImageField(upload_to='qr_codes/', blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name='processed_camera_requests',
        null=True, blank=True
    )
    expires_at = models.DateTimeField(null=True, blank=True)

    def generate_qr_code(self):
        """Generate QR code for camera access"""
        if self.access_link:
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(self.access_link)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, 'PNG')
            buffer.seek(0)

            self.qr_code.save(
                f'qr_camera_{self.id}.png',
                File(buffer),
                save=False
            )

    def __str__(self):
        return f"Camera Request: {self.requester.username} - {self.flat.flat_number}"

    class Meta:
        db_table = 'camera_requests'
        ordering = ['-requested_at']


class Notification(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent')
    ]

    TYPE_CHOICES = [
        ('general', 'General'),
        ('maintenance', 'Maintenance'),
        ('billing', 'Billing'),
        ('security', 'Security'),
        ('event', 'Event'),
        ('emergency', 'Emergency'),
    ]

    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    recipients = models.ManyToManyField(User, related_name='notifications', blank=True)
    read_by = models.ManyToManyField(User, related_name='read_notifications', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    is_active = models.BooleanField(default=True)
    send_email = models.BooleanField(default=False)
    send_sms = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title

    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']


class ActivityLog(models.Model):
    """Log all important activities in the system"""
    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('assign_flat', 'Assign Flat'),
        ('remove_tenant', 'Remove Tenant'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.action} - {self.timestamp}"

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-timestamp']

