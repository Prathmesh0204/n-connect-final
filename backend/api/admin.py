from django.contrib import admin
from django.utils.html import format_html
from .models import (
    UserProfile, Flat, TenantRequest, Vehicle, Complaint,
    MaintenanceBill, CameraAccessRequest, Notification
)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'force_password_change', 'created_at')
    list_filter = ('force_password_change', 'created_at')
    search_fields = ('user__username', 'user__email', 'phone_number')
    list_select_related = ('user',)  # Performance boost
    list_per_page = 25  # Pagination
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('User Information', {
            'fields': ('user', 'phone_number', 'bio', 'avatar')
        }),
        ('System Settings', {
            'fields': ('force_password_change',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Flat)
class FlatAdmin(admin.ModelAdmin):
    list_display = ('flat_number', 'owner', 'get_tenant_count', 'floor', 'area_sqft', 'building')
    list_filter = ('floor', 'building', 'created_at')
    search_fields = ('flat_number', 'owner__username')
    list_select_related = ('owner',)  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('owner',)  # Faster than dropdown
    filter_horizontal = ('tenants',)

    def get_tenant_count(self, obj):
        return obj.tenants.count()

    get_tenant_count.short_description = 'Tenants'

    fieldsets = (
        ('Basic Information', {
            'fields': ('flat_number', 'floor', 'area_sqft', 'building')
        }),
        ('Residents', {
            'fields': ('owner', 'tenants')
        }),
    )


@admin.register(TenantRequest)
class TenantRequestAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'flat', 'get_status_badge', 'requested_at')
    list_filter = ('status', 'requested_at')
    search_fields = ('tenant__username', 'flat__flat_number')
    list_select_related = ('tenant', 'flat', 'processed_by')  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('tenant', 'flat', 'processed_by')  # Faster than dropdown
    readonly_fields = ('requested_at', 'processed_at')

    def get_status_badge(self, obj):
        colors = {'pending': 'orange', 'approved': 'green', 'rejected': 'red'}
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.status, 'black'),
            obj.get_status_display()
        )

    get_status_badge.short_description = 'Status'


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('vehicle_number', 'resident', 'vehicle_type', 'brand', 'color', 'created_at')
    list_filter = ('vehicle_type', 'created_at')
    search_fields = ('vehicle_number', 'resident__username', 'brand')
    list_select_related = ('resident',)  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('resident',)  # Faster than dropdown


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'flat', 'priority', 'status', 'created_at')
    list_filter = ('priority', 'status', 'created_at')
    search_fields = ('title', 'author__username', 'flat__flat_number')
    list_select_related = ('author', 'flat', 'resolved_by')  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('author', 'flat', 'resolved_by')  # Faster than dropdown
    readonly_fields = ('created_at', 'updated_at', 'resolved_at')

    fieldsets = (
        ('Complaint Details', {
            'fields': ('title', 'description', 'priority', 'image')
        }),
        ('Assignment', {
            'fields': ('author', 'flat', 'status', 'admin_response')
        }),
        ('Resolution', {
            'fields': ('resolved_at', 'resolved_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(MaintenanceBill)
class MaintenanceBillAdmin(admin.ModelAdmin):
    list_display = ('flat', 'get_period', 'amount', 'status', 'due_date', 'payment_mode')
    list_filter = ('status', 'bill_year', 'bill_month', 'payment_mode', 'created_at')
    search_fields = ('flat__flat_number', 'flat__owner__username')
    list_select_related = ('flat', 'flat__owner', 'verified_by')  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('flat', 'verified_by')  # Faster than dropdown
    readonly_fields = ('created_at', 'updated_at', 'payment_date', 'verified_at')

    def get_period(self, obj):
        return f"{obj.bill_month:02d}/{obj.bill_year}"

    get_period.short_description = 'Period'


@admin.register(CameraAccessRequest)
class CameraAccessRequestAdmin(admin.ModelAdmin):
    list_display = ('requester', 'flat', 'duration_hours', 'status', 'requested_at')
    list_filter = ('status', 'requested_date', 'requested_at')
    search_fields = ('requester__username', 'flat__flat_number', 'reason')
    list_select_related = ('requester', 'flat', 'processed_by')  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('requester', 'flat', 'processed_by')  # Faster than dropdown
    readonly_fields = ('requested_at', 'processed_at', 'expires_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'priority', 'created_by', 'created_at')
    list_filter = ('priority', 'created_at')
    search_fields = ('title', 'message', 'created_by__username')
    list_select_related = ('created_by',)  # Performance boost
    list_per_page = 25  # Pagination
    raw_id_fields = ('created_by',)  # Faster than dropdown
    filter_horizontal = ('recipients', 'read_by')
