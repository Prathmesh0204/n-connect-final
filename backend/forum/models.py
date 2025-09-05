from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator
import uuid


class ForumCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3498db')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'forum_categories'
        verbose_name_plural = 'Forum Categories'


class ForumPost(models.Model):
    POST_TYPE_CHOICES = [
        ('discussion', 'Discussion'),
        ('announcement', 'Announcement'),
        ('question', 'Question'),
        ('poll', 'Poll')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200, validators=[MinLengthValidator(5)])
    content = models.TextField(validators=[MinLengthValidator(10)])
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_posts')
    category = models.ForeignKey(ForumCategory, on_delete=models.CASCADE, related_name='posts')
    post_type = models.CharField(max_length=15, choices=POST_TYPE_CHOICES, default='discussion')
    is_pinned = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    upvotes = models.ManyToManyField(User, related_name='upvoted_posts', blank=True)
    downvotes = models.ManyToManyField(User, related_name='downvoted_posts', blank=True)
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def vote_score(self):
        return self.upvotes.count() - self.downvotes.count()

    @property
    def comment_count(self):
        return self.comments.count()

    def __str__(self):
        return self.title

    class Meta:
        db_table = 'forum_posts'
        ordering = ['-is_pinned', '-created_at']


class ForumComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='forum_comments')
    content = models.TextField(validators=[MinLengthValidator(3)])
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    upvotes = models.ManyToManyField(User, related_name='upvoted_comments', blank=True)
    downvotes = models.ManyToManyField(User, related_name='downvoted_comments', blank=True)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def vote_score(self):
        return self.upvotes.count() - self.downvotes.count()

    def __str__(self):
        return f"Comment by {self.author.username} on {self.post.title}"

    class Meta:
        db_table = 'forum_comments'
        ordering = ['created_at']
