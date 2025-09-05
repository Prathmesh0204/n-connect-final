import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache
from django.conf import settings
import time

logger = logging.getLogger(__name__)


class SecurityMiddleware(MiddlewareMixin):
    """Custom security middleware for additional protection"""

    def process_request(self, request):
        # Rate limiting by IP
        client_ip = self.get_client_ip(request)
        cache_key = f"rate_limit_{client_ip}"
        requests = cache.get(cache_key, 0)

        if requests >= 100:  # 100 requests per minute
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JsonResponse(
                {"error": "Rate limit exceeded. Please try again later."},
                status=429
            )

        cache.set(cache_key, requests + 1, 60)  # Reset every minute

        # Security headers
        request.start_time = time.time()

        return None

    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Log response time
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            if duration > 2:  # Log slow requests
                logger.warning(f"Slow request: {request.path} took {duration:.2f}s")

        return response

    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
