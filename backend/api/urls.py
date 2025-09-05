from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserManagementViewSet, basename='user')
router.register(r'flats', views.FlatViewSet, basename='flat')
router.register(r'vehicles', views.VehicleViewSet, basename='vehicle')
router.register(r'complaints', views.ComplaintViewSet, basename='complaint')
router.register(r'bills', views.MaintenanceBillViewSet, basename='bill')
router.register(r'camera-requests', views.CameraAccessRequestViewSet, basename='camerarequest')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('user-status/', views.UserStatusView.as_view(), name='user-status'),
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile-update'),
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('bills/<int:bill_id>/receipt/', views.generate_receipt_pdf, name='receipt-pdf'),
]
