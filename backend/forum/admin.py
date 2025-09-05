from django.contrib import admin
from .models import ForumCategory, ForumPost, ForumComment

@admin.register(ForumCategory)
class ForumCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'description')

@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'post_type', 'vote_score', 'comment_count', 'views', 'created_at')
    list_filter = ('post_type', 'category', 'is_pinned', 'is_locked', 'created_at')
    search_fields = ('title', 'content', 'author__username')
    readonly_fields = ('id', 'views', 'created_at', 'updated_at')

@admin.register(ForumComment)
class ForumCommentAdmin(admin.ModelAdmin):
    list_display = ('post', 'author', 'vote_score', 'is_edited', 'created_at')
    list_filter = ('is_edited', 'created_at')
    search_fields = ('content', 'author__username', 'post__title')
    readonly_fields = ('id', 'created_at', 'updated_at')
