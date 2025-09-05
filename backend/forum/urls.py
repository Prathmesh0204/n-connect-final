from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ForumCategoryViewSet, basename='forum-category')
router.register(r'posts', views.ForumPostViewSet, basename='forum-post')
router.register(r'comments', views.ForumCommentViewSet, basename='forum-comment')

urlpatterns = [
    path('', include(router.urls)),
]
