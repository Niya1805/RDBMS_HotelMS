import os
from dotenv import load_dotenv

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BACKEND_DIR, ".env"), override=True)


class Config:
    """Application and MySQL 8 database configuration loaded from environment variables."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-placeholder-secret-key")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
    TESTING = False

    # Academic role-based authorization passcode for administrative operations
    ADMIN_PASSCODE = os.getenv("ADMIN_PASSCODE", "admin123")

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ] + ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]

    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "hotel_reservation_db")
    TEST_DB_NAME = os.getenv("TEST_DB_NAME", "hotel_reservation_test_db")

    # The 9 core entities extracted from Diagram1.dia
    ER_ENTITIES = [
        "User",
        "Location",
        "Services",
        "Bookings",
        "Payment",
        "Cancellation",
        "Invoices",
        "Reviews",
        "Notification",
    ]
