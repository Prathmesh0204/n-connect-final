from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import *


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_active']
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['failed_login_attempts', 'account_locked_until', 'last_login_ip']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile and user info together"""
    username = serializers.CharField(source='user.username', required=False)
    email = serializers.EmailField(source='user.email', required=False)
    first_name = serializers.CharField(source='user.first_name', required=False)
    last_name = serializers.CharField(source='user.last_name', required=False)
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = UserProfile
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'phone_number', 'bio', 'date_of_birth', 'emergency_contact',
            'emergency_contact_name', 'avatar', 'current_password',
            'new_password', 'confirm_password'
        ]

    def validate(self, attrs):
        user = self.context['request'].user

        # Check if username is unique
        new_username = attrs.get('user', {}).get('username')
        if new_username and User.objects.filter(username=new_username).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("Username already exists")

        # Password validation
        current_password = attrs.get('current_password')
        new_password = attrs.get('new_password')
        confirm_password = attrs.get('confirm_password')

        if new_password:
            if not current_password:
                raise serializers.ValidationError("Current password is required to set new password")

            if not user.check_password(current_password):
                raise serializers.ValidationError("Current password is incorrect")

            if new_password != confirm_password:
                raise serializers.ValidationError("New passwords do not match")

            validate_password(new_password, user)

        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('current_password', None)
        validated_data.pop('confirm_password', None)

        # Update user fields
        user = instance.user
        for attr, value in user_data.items():
            setattr(user, attr, value)

        if new_password:
            user.set_password(new_password)
            instance.force_password_change = False

        user.save()

        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


class FlatSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    tenants = UserSerializer(many=True, read_only=True)
    tenant_count = serializers.SerializerMethodField()
    current_occupants = serializers.SerializerMethodField()

    class Meta:
        model = Flat
        fields = '__all__'

    def get_tenant_count(self, obj):
        return obj.tenants.count()

    def get_current_occupants(self, obj):
        occupants = []
        if obj.owner:
            occupants.append({
                'id': obj.owner.id,
                'username': obj.owner.username,
                'type': 'owner'
            })
        for tenant in obj.tenants.all():
            occupants.append({
                'id': tenant.id,
                'username': tenant.username,
                'type': 'tenant'
            })
        return occupants


class FlatAssignmentSerializer(serializers.ModelSerializer):
    flat = FlatSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    assigned_by = UserSerializer(read_only=True)

    class Meta:
        model = FlatAssignment
        fields = '__all__'


class TenantRequestSerializer(serializers.ModelSerializer):
    tenant = UserSerializer(read_only=True)
    flat = FlatSerializer(read_only=True)
    processed_by = UserSerializer(read_only=True)

    class Meta:
        model = TenantRequest
        fields = '__all__'


class VehicleSerializer(serializers.ModelSerializer):
    resident = UserSerializer(read_only=True)
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)

    class Meta:
        model = Vehicle
        fields = '__all__'


class ComplaintSerializer(serializers.ModelSerializer):
    # ✅ FIX: Allow writing flat ID while still showing full details on read
    author = UserSerializer(read_only=True)
    flat = FlatSerializer(read_only=True)
    flat_id = serializers.PrimaryKeyRelatedField(
        queryset=Flat.objects.all(), source='flat', write_only=True
    )
    resolved_by = UserSerializer(read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = Complaint
        fields = '__all__'


class MaintenanceBillSerializer(serializers.ModelSerializer):
    # ✅ FIX: Allow writing flat ID while still showing full details on read
    flat = FlatSerializer(read_only=True)
    flat_id = serializers.PrimaryKeyRelatedField(
        queryset=Flat.objects.all(), source='flat', write_only=True
    )
    verified_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bill_type_display = serializers.CharField(source='get_bill_type_display', read_only=True)
    total_amount = serializers.ReadOnlyField()
    is_overdue = serializers.ReadOnlyField()

    class Meta:
        model = MaintenanceBill
        # Make sure flat_id is in the fields list to be processed
        fields = [
            'id', 'flat', 'flat_id', 'bill_type', 'bill_month', 'bill_year',
            'amount', 'due_date', 'status', 'description', 'late_fee', 'discount',
            'payment_screenshot', 'payment_mode', 'transaction_id', 'payment_date',
            'verified_by', 'verified_at', 'created_at', 'updated_at',
            'status_display', 'bill_type_display', 'total_amount', 'is_overdue'
        ]


class CameraAccessRequestSerializer(serializers.ModelSerializer):
    # ✅ FIX: Allow writing flat ID while still showing full details on read
    requester = UserSerializer(read_only=True)
    flat = FlatSerializer(read_only=True)
    flat_id = serializers.PrimaryKeyRelatedField(
        queryset=Flat.objects.all(), source='flat', write_only=True
    )
    processed_by = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CameraAccessRequest
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    recipients = UserSerializer(many=True, read_only=True)
    read_by = UserSerializer(many=True, read_only=True)
    is_read = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = Notification
        fields = '__all__'

    def get_is_read(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user in obj.read_by.all()
        return False


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = '__all__'
