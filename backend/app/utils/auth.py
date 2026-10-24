from functools import wraps
from flask import request, current_app
from app.config import Config
from app.utils.responses import error_response


def require_admin(fn):
    """
    Academic authorization check for administrative endpoints.
    Verifies the 'X-Admin-Passcode' header against ADMIN_PASSCODE in environment config.
    Note: This is a lightweight role gate for an academic RDBMS project, not production OAuth/JWT.
    """

    @wraps(fn)
    def wrapper(*args, **kwargs):
        expected_passcode = (
            current_app.config.get("ADMIN_PASSCODE") if current_app else None
        ) or Config.ADMIN_PASSCODE
        provided_passcode = request.headers.get("X-Admin-Passcode", "").strip()

        if not provided_passcode or provided_passcode != expected_passcode:
            return error_response(
                message="Administrative authorization required. Provide a valid X-Admin-Passcode header.",
                status_code=403,
                code="ADMIN_FORBIDDEN",
            )
        return fn(*args, **kwargs)

    return wrapper
