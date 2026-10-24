from flask import jsonify
from app.db import serialize_row


class ValidationError(Exception):
    """Raised when incoming request data fails backend validation."""

    def __init__(self, message, status_code=400, code="VALIDATION_ERROR", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def success_response(data=None, message=None, status_code=200, meta=None):
    """Return a consistent JSON success payload."""
    payload = {"status": "success"}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = serialize_row(data)
    if meta is not None:
        payload["meta"] = serialize_row(meta)
    return jsonify(payload), status_code


def error_response(message, status_code=400, code="BAD_REQUEST", details=None):
    """Return a consistent JSON error payload."""
    payload = {
        "status": "error",
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details:
        payload["error"]["details"] = details
    return jsonify(payload), status_code
