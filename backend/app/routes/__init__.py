from flask import Blueprint

api_bp = Blueprint("api", __name__, url_prefix="/api")

from app.routes import (  # noqa: E402, F401
    health,
    locations,
    services,
    users,
    bookings,
    payments_invoices,
    reviews_notifications,
    reports,
)
