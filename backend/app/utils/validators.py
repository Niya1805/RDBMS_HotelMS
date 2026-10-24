import re
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from app.utils.responses import ValidationError

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_REGEX = re.compile(r"^[0-9+\-\s()]{7,20}$")

VALID_CATEGORIES = ("Room", "Add-On")
VALID_BOOKING_STATUSES = ("Pending", "Confirmed", "Cancelled", "Completed")
VALID_PAYMENT_METHODS = ("Credit Card", "Debit Card", "UPI", "Net Banking", "Cash")


def require_json_body(data):
    if not isinstance(data, dict):
        raise ValidationError("Request body must be a valid JSON object.")
    return data


def validate_non_empty_str(value, field_name, min_len=1, max_len=500):
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field_name}' is required and must be a non-empty string.")
    cleaned = value.strip()
    if len(cleaned) < min_len:
        raise ValidationError(f"'{field_name}' must be at least {min_len} characters long.")
    if len(cleaned) > max_len:
        raise ValidationError(f"'{field_name}' cannot exceed {max_len} characters.")
    return cleaned


def validate_positive_int(value, field_name, min_val=1):
    if value is None or isinstance(value, bool):
        raise ValidationError(f"'{field_name}' is required and must be an integer >= {min_val}.")
    try:
        ival = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"'{field_name}' must be a valid integer.") from None
    if ival < min_val:
        raise ValidationError(f"'{field_name}' must be at least {min_val}.")
    return ival


def validate_decimal_amount(value, field_name, allow_zero=False):
    if value is None or isinstance(value, bool):
        raise ValidationError(f"'{field_name}' is required and must be a valid monetary amount.")
    try:
        dval = Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(f"'{field_name}' must be a valid decimal number.") from None
    if allow_zero and dval < Decimal("0.00"):
        raise ValidationError(f"'{field_name}' cannot be negative.")
    if not allow_zero and dval <= Decimal("0.00"):
        raise ValidationError(f"'{field_name}' must be greater than 0.00.")
    return dval


def validate_email(value):
    cleaned = validate_non_empty_str(value, "Email", min_len=5, max_len=150)
    if not EMAIL_REGEX.match(cleaned):
        raise ValidationError("'Email' must be a valid email address (e.g., guest@example.com).")
    return cleaned.lower()


def validate_phone(value):
    cleaned = validate_non_empty_str(value, "Phone", min_len=7, max_len=20)
    if not PHONE_REGEX.match(cleaned):
        raise ValidationError("'Phone' must contain 7 to 20 digits or standard phone characters (+, -, spaces).")
    return cleaned


def parse_iso_date(value, field_name):
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if not isinstance(value, str) or not value.strip():
        raise ValidationError(f"'{field_name}' is required in YYYY-MM-DD format.")
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError(f"'{field_name}' must be a valid date in YYYY-MM-DD format.") from None


def validate_date_range(check_in_str, check_out_str):
    check_in = parse_iso_date(check_in_str, "check_in")
    check_out = parse_iso_date(check_out_str, "check_out")
    if check_out <= check_in:
        raise ValidationError("Check-out date must be strictly later than check-in date.")
    return check_in, check_out


def validate_enum(value, field_name, allowed_values):
    if value not in allowed_values:
        allowed_str = ", ".join(allowed_values)
        raise ValidationError(f"'{field_name}' must be one of: {allowed_str}.")
    return value
