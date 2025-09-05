from rest_framework import serializers
from django.contrib.auth.models import User
from .models import ForumCategory, ForumPost, ForumComment


class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class ForumCategorySerializer(serializers.ModelSerializer):
    posts_count = serializers.SerializerMethodField()

    class Meta:
        model = ForumCategory
        fields = ['id', 'name', 'description', 'color', 'is_active', 'posts_count', 'created_at']

    def get_posts_count(self, obj):
        return obj.posts.count()


class ForumCommentSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    vote_score = serializers.ReadOnlyField()
    replies = serializers.SerializerMethodField()

    class Meta:
        model = ForumComment
        fields = ['id', 'content', 'author', 'vote_score', 'is_edited', 'created_at', 'updated_at', 'replies']

    def get_replies(self, obj):
        if obj.parent is None:
            replies = obj.replies.all()[:5]
            return ForumCommentSerializer(replies, many=True).data
        return []


class ForumPostSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    category = ForumCategorySerializer(read_only=True)
    category_id = serializers.IntegerField(write_only=True)
    vote_score = serializers.ReadOnlyField()
    comment_count = serializers.ReadOnlyField()
    comments = ForumCommentSerializer(many=True, read_only=True)

    class Meta:
        model = ForumPost
        fields = ['id', 'title', 'content', 'author', 'category', 'category_id', 'post_type',
                  'is_pinned', 'is_locked', 'vote_score', 'comment_count', 'views',
                  'created_at', 'updated_at', 'comments']

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
