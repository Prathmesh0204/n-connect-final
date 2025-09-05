from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count
from .models import ForumCategory, ForumPost, ForumComment
from .serializers import ForumCategorySerializer, ForumPostSerializer, ForumCommentSerializer

class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow authors of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

class ForumCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A viewset for viewing forum categories.
    """
    queryset = ForumCategory.objects.filter(is_active=True).annotate(posts_count=Count('posts'))
    serializer_class = ForumCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class ForumPostViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing forum posts.
    """
    queryset = ForumPost.objects.all().select_related('author', 'category').prefetch_related('comments', 'upvotes', 'downvotes')
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        category_id = self.request.data.get('category_id')
        category = ForumCategory.objects.get(id=category_id)
        serializer.save(author=self.request.user, category=category)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def upvote(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if user in post.downvotes.all():
            post.downvotes.remove(user)
        if user in post.upvotes.all():
            post.upvotes.remove(user)
        else:
            post.upvotes.add(user)
        return Response({'status': 'vote updated', 'score': post.vote_score})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def downvote(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if user in post.upvotes.all():
            post.upvotes.remove(user)
        if user in post.downvotes.all():
            post.downvotes.remove(user)
        else:
            post.downvotes.add(user)
        return Response({'status': 'vote updated', 'score': post.vote_score})


class ForumCommentViewSet(viewsets.ModelViewSet):
    """
    A viewset for viewing and editing forum comments.
    """
    queryset = ForumComment.objects.all().select_related('author', 'post')
    serializer_class = ForumCommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]

    def perform_create(self, serializer):
        post_id = self.request.data.get('post_id')
        post = ForumPost.objects.get(id=post_id)
        serializer.save(author=self.request.user, post=post)
