from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
from datetime import datetime, timedelta
import logging

from .models import *
from .serializers import *

logger = logging.getLogger(__name__)


# Custom Permission Classes
class IsOwnerOrAdmin(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        if hasattr(obj, 'owner') and obj.owner == request.user:
            return True
        if hasattr(obj, 'author') and obj.author == request.user:
            return True
        if hasattr(obj, 'resident') and obj.resident == request.user:
            return True
        if hasattr(obj, 'requester') and obj.requester == request.user:
            return True
        if hasattr(obj, 'user') and obj.user == request.user:
            return True

        return False


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


# Utility Views
class UserStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Log activity
        ActivityLog.objects.create(
            user=user,
            action='login',
            description=f'User {user.username} checked status',
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        return Response({
            'id': user.id,
            'is_superuser': user.is_superuser,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'force_password_change': profile.force_password_change,
            'phone_number': profile.phone_number,
            'bio': profile.bio,
            'avatar': profile.avatar.url if profile.avatar else None,
            'email_verified': profile.email_verified,
            'phone_verified': profile.phone_verified,
            'two_factor_enabled': profile.two_factor_enabled,
        })

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ProfileUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request):
        user = request.user
        profile = user.profile

        serializer = ProfileUpdateSerializer(
            profile,
            data=request.data,
            context={'request': request},
            partial=True
        )

        if serializer.is_valid():
            serializer.save()

            # Log activity
            ActivityLog.objects.create(
                user=user,
                action='update',
                description=f'User {user.username} updated profile',
                ip_address=UserStatusView.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )

            logger.info(f"User {user.username} updated their profile")
            return Response({"message": "Profile updated successfully."})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Get dashboard statistics
        stats = {
            'total_users': User.objects.filter(is_active=True).count(),
            'total_flats': Flat.objects.count(),
            'occupied_flats': Flat.objects.filter(is_occupied=True).count(),
            'total_vehicles': Vehicle.objects.filter(is_active=True).count(),
            'pending_complaints': Complaint.objects.filter(status__in=['open', 'in_progress']).count(),
            'overdue_bills': MaintenanceBill.objects.filter(
                due_date__lt=timezone.now().date(),
                status='unpaid'
            ).count(),
            'pending_camera_requests': CameraAccessRequest.objects.filter(status='pending').count(),
            'active_notifications': Notification.objects.filter(
                is_active=True,
                expires_at__gt=timezone.now()
            ).count(),
        }

        # Recent activities
        recent_activities = ActivityLog.objects.select_related('user').order_by('-timestamp')[:10]
        activities_data = ActivityLogSerializer(recent_activities, many=True).data

        # Monthly statistics
        current_month = timezone.now().month
        current_year = timezone.now().year

        monthly_stats = {
            'new_users_this_month': User.objects.filter(
                date_joined__month=current_month,
                date_joined__year=current_year
            ).count(),
            'complaints_this_month': Complaint.objects.filter(
                created_at__month=current_month,
                created_at__year=current_year
            ).count(),
            'bills_generated_this_month': MaintenanceBill.objects.filter(
                created_at__month=current_month,
                created_at__year=current_year
            ).count(),
        }

        return Response({
            'stats': stats,
            'monthly_stats': monthly_stats,
            'recent_activities': activities_data
        })


# Main ViewSets
class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related('profile')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    filterset_fields = ['is_active', 'is_superuser']
    ordering = ['username']

    @action(detail=True, methods=['post'])
    def assign_flat(self, request, pk=None):
        """Assign flat to user (owner or tenant)"""
        user = self.get_object()
        flat_id = request.data.get('flat_id')
        assignment_type = request.data.get('assignment_type', 'tenant')  # 'owner' or 'tenant'
        notes = request.data.get('notes', '')

        if not flat_id:
            return Response({'error': 'Flat ID is required'}, status=400)

        try:
            flat = Flat.objects.get(id=flat_id)
        except Flat.DoesNotExist:
            return Response({'error': 'Flat not found'}, status=404)

        try:
            with transaction.atomic():
                if assignment_type == 'owner':
                    # Remove current owner if exists
                    if flat.owner:
                        FlatAssignment.objects.filter(
                            flat=flat,
                            user=flat.owner,
                            assignment_type='owner',
                            revoked_at__isnull=True
                        ).update(revoked_at=timezone.now())

                    flat.owner = user
                    flat.is_occupied = True
                    flat.save()

                elif assignment_type == 'tenant':
                    flat.tenants.add(user)
                    flat.is_occupied = True
                    flat.save()

                # Create assignment record
                FlatAssignment.objects.create(
                    flat=flat,
                    user=user,
                    assignment_type=assignment_type,
                    assigned_by=request.user,
                    notes=notes
                )

                # Log activity
                ActivityLog.objects.create(
                    user=request.user,
                    action='assign_flat',
                    description=f'Assigned flat {flat.flat_number} to {user.username} as {assignment_type}',
                    ip_address=UserStatusView.get_client_ip(request),
                    content_object=flat
                )

                logger.info(f"Admin {request.user.username} assigned flat {flat.flat_number} to {user.username}")

                return Response({'message': f'Flat assigned to {user.username} as {assignment_type}'})

        except Exception as e:
            logger.error(f"Error assigning flat: {str(e)}")
            return Response({'error': 'Failed to assign flat'}, status=500)

    @action(detail=True, methods=['post'])
    def remove_from_flat(self, request, pk=None):
        """Remove user from flat"""
        user = self.get_object()
        flat_id = request.data.get('flat_id')

        if not flat_id:
            return Response({'error': 'Flat ID is required'}, status=400)

        try:
            flat = Flat.objects.get(id=flat_id)
        except Flat.DoesNotExist:
            return Response({'error': 'Flat not found'}, status=404)

        try:
            with transaction.atomic():
                # Remove as owner
                if flat.owner == user:
                    flat.owner = None
                    flat.save()

                    # Mark assignment as revoked
                    FlatAssignment.objects.filter(
                        flat=flat,
                        user=user,
                        assignment_type='owner',
                        revoked_at__isnull=True
                    ).update(revoked_at=timezone.now())

                # Remove as tenant
                if user in flat.tenants.all():
                    flat.tenants.remove(user)

                    # Mark assignment as revoked
                    FlatAssignment.objects.filter(
                        flat=flat,
                        user=user,
                        assignment_type='tenant',
                        revoked_at__isnull=True
                    ).update(revoked_at=timezone.now())

                # Update occupancy status
                if not flat.owner and not flat.tenants.exists():
                    flat.is_occupied = False
                    flat.save()

                # Log activity
                ActivityLog.objects.create(
                    user=request.user,
                    action='remove_tenant',
                    description=f'Removed {user.username} from flat {flat.flat_number}',
                    ip_address=UserStatusView.get_client_ip(request),
                    content_object=flat
                )

                return Response({'message': f'User {user.username} removed from flat {flat.flat_number}'})

        except Exception as e:
            logger.error(f"Error removing user from flat: {str(e)}")
            return Response({'error': 'Failed to remove user from flat'}, status=500)

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password"""
        user = self.get_object()
        new_password = request.data.get('new_password')

        if not new_password:
            return Response({'error': 'New password is required'}, status=400)

        try:
            user.set_password(new_password)
            user.profile.force_password_change = True
            user.save()
            user.profile.save()

            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action='password_change',
                description=f'Admin reset password for {user.username}',
                ip_address=UserStatusView.get_client_ip(request),
                content_object=user
            )

            logger.info(f"Admin {request.user.username} reset password for {user.username}")

            return Response({'message': 'Password reset successfully'})

        except Exception as e:
            logger.error(f"Error resetting password: {str(e)}")
            return Response({'error': 'Failed to reset password'}, status=500)


class FlatViewSet(viewsets.ModelViewSet):
    serializer_class = FlatSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['flat_number', 'building']
    filterset_fields = ['floor', 'is_occupied', 'building', 'tenants', 'owner']
    ordering = ['flat_number']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Flat.objects.all().select_related('owner').prefetch_related('tenants')

        # This will return flats where the user is either the owner OR one of the tenants.
        # It handles the case where a user might be a tenant in one flat and own another.
        return Flat.objects.filter(
            Q(owner=user) | Q(tenants=user)
        ).distinct().select_related('owner').prefetch_related('tenants')

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only administrators can create flats")

        flat = serializer.save()

        # Log activity
        ActivityLog.objects.create(
            user=self.request.user,
            action='create',
            description=f'Created flat {flat.flat_number}',
            ip_address=UserStatusView.get_client_ip(self.request),
            content_object=flat
        )


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vehicle_number', 'brand', 'model', 'color']
    filterset_fields = ['vehicle_type', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Vehicle.objects.all().select_related('resident')
        return Vehicle.objects.filter(resident=user).select_related('resident')

    def perform_create(self, serializer):
        try:
            vehicle = serializer.save(resident=self.request.user)

            # Log activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='create',
                description=f'Registered vehicle {vehicle.vehicle_number}',
                ip_address=UserStatusView.get_client_ip(self.request),
                content_object=vehicle
            )

            logger.info(f"Vehicle registered: {vehicle.vehicle_number} by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error registering vehicle for {self.request.user.username}: {str(e)}")
            raise ValidationError("Failed to register vehicle")

    @action(detail=False, methods=['get'])
    def search_all(self, request):
        """Advanced vehicle search with owner details"""
        query = request.query_params.get('q', '')
        if not query or len(query) < 2:
            return Response({'results': []})

        try:
            if request.user.is_superuser:
                vehicles = Vehicle.objects.filter(
                    Q(vehicle_number__icontains=query) |
                    Q(brand__icontains=query) |
                    Q(color__icontains=query) |
                    Q(resident__username__icontains=query)
                ).select_related('resident')[:20]
            else:
                vehicles = Vehicle.objects.filter(
                    resident=request.user
                ).filter(
                    Q(vehicle_number__icontains=query) |
                    Q(brand__icontains=query) |
                    Q(color__icontains=query)
                )[:10]

            results = []
            for vehicle in vehicles:
                owner_flats = vehicle.resident.owned_flats.all()
                tenant_flats = vehicle.resident.rented_flats.all()

                results.append({
                    'id': vehicle.id,
                    'vehicle_number': vehicle.vehicle_number,
                    'vehicle_type': vehicle.get_vehicle_type_display(),
                    'brand': vehicle.brand,
                    'color': vehicle.color,
                    'resident': {'username': vehicle.resident.username},
                    'owner_name': vehicle.resident.username,
                    'flat_numbers': [flat.flat_number for flat in owner_flats] +
                                    [flat.flat_number for flat in tenant_flats],
                    'contact': getattr(vehicle.resident.profile, 'phone_number', 'N/A'),
                    'created_at': vehicle.created_at.isoformat()
                })

            return Response({'results': results})
        except Exception as e:
            logger.error(f"Error searching vehicles: {str(e)}")
            return Response({'error': 'Search failed'}, status=500)


class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    filterset_fields = ['status', 'priority', 'category']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Complaint.objects.all().select_related('author', 'flat', 'resolved_by')

        return Complaint.objects.filter(
            Q(flat__owner=user) | Q(author=user) | Q(flat__tenants=user)
        ).distinct().select_related('author', 'flat', 'resolved_by')

    def perform_create(self, serializer):
        # ✅ FIX: Changed from .get('flat') to .get('flat_id') to match the serializer
        flat_id = self.request.data.get('flat_id')
        if not flat_id:
            # This is now mainly a safeguard, as the serializer handles the validation
            raise ValidationError("Flat ID is required")

        flat = get_object_or_404(Flat, id=flat_id)

        if (flat.owner != self.request.user and
                self.request.user not in flat.tenants.all() and
                not self.request.user.is_superuser):
            raise PermissionDenied("You can only file complaints for your own flats")

        try:
            # Pass the flat object to the save method
            complaint = serializer.save(author=self.request.user, flat=flat)

            # Log activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='create',
                description=f'Filed complaint: {complaint.title}',
                ip_address=UserStatusView.get_client_ip(self.request),
                content_object=complaint
            )

            logger.info(f"Complaint filed: {complaint.title} by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error filing complaint: {str(e)}")
            raise ValidationError("Failed to file complaint")

    @action(detail=False, methods=['get'])
    def my_complaints(self, request):
        """Get current user's complaints"""
        complaints = Complaint.objects.filter(
            author=request.user
        ).select_related('flat').order_by('-created_at')

        page = self.paginate_queryset(complaints)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(complaints, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def update_status(self, request, pk=None):
        """Update complaint status (admin only)"""
        complaint = self.get_object()
        new_status = request.data.get('status')
        admin_response = request.data.get('admin_response', '')
        estimated_resolution_date = request.data.get('estimated_resolution_date')

        if new_status not in dict(Complaint.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=400)

        try:
            with transaction.atomic():
                complaint.status = new_status
                complaint.admin_response = admin_response

                if estimated_resolution_date:
                    complaint.estimated_resolution_date = estimated_resolution_date

                if new_status == 'resolved':
                    complaint.resolved_at = timezone.now()
                    complaint.resolved_by = request.user
                    complaint.actual_resolution_date = timezone.now().date()

                complaint.save()

                # Log activity
                ActivityLog.objects.create(
                    user=request.user,
                    action='update',
                    description=f'Updated complaint {complaint.id} status to {new_status}',
                    ip_address=UserStatusView.get_client_ip(request),
                    content_object=complaint
                )

                logger.info(f"Complaint {complaint.id} status updated to {new_status} by {request.user.username}")

                return Response({'status': f'Complaint status updated to {new_status}'})
        except Exception as e:
            logger.error(f"Error updating complaint status: {str(e)}")
            return Response({'error': 'Failed to update complaint status'}, status=500)


class MaintenanceBillViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceBillSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'bill_type', 'flat', 'bill_year', 'bill_month']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return MaintenanceBill.objects.all().select_related('flat__owner', 'verified_by')

        return MaintenanceBill.objects.filter(
            Q(flat__owner=user) | Q(flat__tenants=user)
        ).distinct().select_related('flat__owner', 'verified_by')

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only administrators can create maintenance bills")

        try:
            # The serializer now handles associating the flat_id
            bill = serializer.save()

            # Log activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='create',
                description=f'Created maintenance bill for flat {bill.flat.flat_number}',
                ip_address=UserStatusView.get_client_ip(self.request),
                content_object=bill
            )

            logger.info(f"Maintenance bill created: {bill.flat.flat_number} - {bill.bill_month}/{bill.bill_year}")
        except Exception as e:
            logger.error(f"Error creating maintenance bill: {str(e)}")
            # Raise the original validation error if available, otherwise a generic one
            if isinstance(e, DjangoValidationError):
                raise ValidationError(e.message_dict)
            raise ValidationError("Failed to create maintenance bill")


class CameraAccessRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CameraAccessRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status']
    ordering = ['-requested_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return CameraAccessRequest.objects.all().select_related('requester', 'flat', 'processed_by')

        return CameraAccessRequest.objects.filter(
            Q(flat__owner=user) | Q(requester=user) | Q(flat__tenants=user)
        ).distinct().select_related('requester', 'flat', 'processed_by')

    def perform_create(self, serializer):
        # ✅ FIX: Changed from .get('flat') to .get('flat_id') to match the serializer
        flat_id = self.request.data.get('flat_id')
        if not flat_id:
            raise ValidationError("Flat ID is required")

        flat = get_object_or_404(Flat, id=flat_id)

        if (flat.owner != self.request.user and
                self.request.user not in flat.tenants.all()):
            raise PermissionDenied("You can only request camera access for your own flats")

        try:
            # The serializer will use the flat_id from validated_data
            # We pass requester here because it's based on the logged-in user, not submitted data
            camera_request = serializer.save(requester=self.request.user)

            # Log activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='create',
                description=f'Requested camera access for flat {flat.flat_number}',
                ip_address=UserStatusView.get_client_ip(self.request),
                content_object=camera_request
            )

            logger.info(f"Camera access requested: {camera_request.id} by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error requesting camera access: {str(e)}")
            raise ValidationError("Failed to request camera access")


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'priority', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Notification.objects.all().select_related('created_by').prefetch_related('recipients', 'read_by')

        return Notification.objects.filter(
            Q(recipients=user) | Q(recipients__isnull=True),
            is_active=True
        ).distinct().select_related('created_by').prefetch_related('recipients', 'read_by')

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Only administrators can create notifications")

        try:
            notification = serializer.save(created_by=self.request.user)

            # Add all users as recipients if none specified
            if not notification.recipients.exists():
                notification.recipients.set(User.objects.filter(is_active=True))

            # Log activity
            ActivityLog.objects.create(
                user=self.request.user,
                action='create',
                description=f'Created notification: {notification.title}',
                ip_address=UserStatusView.get_client_ip(self.request),
                content_object=notification
            )

            logger.info(f"Notification created: {notification.title} by {self.request.user.username}")
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            raise ValidationError("Failed to create notification")

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.read_by.add(request.user)
        return Response({'status': 'Notification marked as read'})


# PDF Receipt Generation
def generate_receipt_pdf(request, bill_id):
    """Generate PDF receipt for paid bills"""
    if not request.user.is_authenticated:
        return HttpResponse("Authentication required", status=401)

    try:
        bill = get_object_or_404(MaintenanceBill, id=bill_id, status='paid')

        # Check permissions
        if (not request.user.is_superuser and
                bill.flat.owner != request.user and
                request.user not in bill.flat.tenants.all()):
            return HttpResponse("Permission denied", status=403)

    except MaintenanceBill.DoesNotExist:
        return HttpResponse("Bill not found or not paid", status=404)

    # Generate PDF
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Header
    p.setFont("Helvetica-Bold", 20)
    p.drawString(2 * 72, height - 2 * 72, "N-Connect Society Management")
    p.setFont("Helvetica-Bold", 14)
    p.drawString(2 * 72, height - 2.5 * 72, "Payment Receipt")

    # Receipt details
    p.setFont("Helvetica", 12)
    y = height - 4 * 72

    details = [
        f"Receipt No: NCR{bill.id:06d}",
        f"Date: {bill.payment_date.strftime('%d-%b-%Y %I:%M %p') if bill.payment_date else 'N/A'}",
        f"Flat: {bill.flat.flat_number}",
        f"Bill Type: {bill.get_bill_type_display()}",
        f"Bill Period: {bill.bill_month:02d}/{bill.bill_year}",
        f"Amount: ₹{bill.amount}",
        f"Late Fee: ₹{bill.late_fee}",
        f"Discount: ₹{bill.discount}",
        f"Total Amount: ₹{bill.total_amount}",
        f"Payment Mode: {bill.get_payment_mode_display() if bill.payment_mode else 'N/A'}",
        f"Transaction ID: {bill.transaction_id or 'N/A'}",
        f"Verified By: {bill.verified_by.username if bill.verified_by else 'System'}",
        f"Verified On: {bill.verified_at.strftime('%d-%b-%Y') if bill.verified_at else 'N/A'}"
    ]

    for detail in details:
        p.drawString(2 * 72, y, detail)
        y -= 20

    # Footer
    p.setFont("Helvetica-Italic", 10)
    p.drawString(2 * 72, 2 * 72, "This is a computer-generated receipt.")
    p.drawString(2 * 72, 1.7 * 72, f"Generated on: {timezone.now().strftime('%d-%b-%Y %I:%M %p')}")

    p.showPage()
    p.save()

    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="receipt_NCR{bill.id:06d}.pdf"'

    logger.info(f"Receipt generated for bill {bill.id} by {request.user.username}")

    return response

