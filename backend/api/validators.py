import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """Custom password validator with enhanced security"""

    def validate(self, password, user=None):
        if len(password) < 8:
            raise ValidationError(_("Password must be at least 8 characters long."))

        if not re.search(r'[A-Z]', password):
            raise ValidationError(_("Password must contain at least one uppercase letter."))

        if not re.search(r'[a-z]', password):
            raise ValidationError(_("Password must contain at least one lowercase letter."))

        if not re.search(r'[0-9]', password):
            raise ValidationError(_("Password must contain at least one digit."))

        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(_("Password must contain at least one special character."))

        # Check for common patterns
        if user and user.username and user.username.lower() in password.lower():
            raise ValidationError(_("Password cannot contain your username."))

    def get_help_text(self):
        return _(
            "Your password must contain at least 8 characters, including uppercase, "
            "lowercase, digit, and special character."
        )
