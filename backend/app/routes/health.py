from flask import jsonify
from app.routes import api_bp
from app.db import verify_database_connection


@api_bp.route("/health", methods=["GET"])
def health_check():
    """Return API status and live MySQL 8 connection & ER schema inspection."""
    db_status = verify_database_connection()
    return jsonify(
        {
            "status": "ok",
            "service": "Hotel Reservation System REST API",
            "database": db_status,
        }
    ), 200
