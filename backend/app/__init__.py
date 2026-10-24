from flask import Flask
from flask_cors import CORS
from app.config import Config
from app.db import DatabaseError
from app.routes import api_bp
from app.utils.responses import ValidationError, error_response


def create_app(config_overrides=None):
    """Flask application factory with CORS, REST Blueprint, and sanitized JSON error handlers."""
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    # Enable CORS for the React Vite frontend
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", Config.CORS_ORIGINS)}},
        supports_credentials=True,
    )

    # Register REST API blueprint
    app.register_blueprint(api_bp)

    # Global JSON Error Handlers
    @app.errorhandler(ValidationError)
    def handle_validation_error(err):
        return error_response(
            message=err.message,
            status_code=err.status_code,
            code=err.code,
            details=err.details,
        )

    @app.errorhandler(DatabaseError)
    def handle_database_error(err):
        return error_response(
            message=err.public_message,
            status_code=err.status_code,
            code=err.code,
        )

    @app.errorhandler(404)
    def handle_not_found(_err):
        return error_response(
            message="The requested API endpoint or resource was not found.",
            status_code=404,
            code="NOT_FOUND",
        )

    @app.errorhandler(405)
    def handle_method_not_allowed(_err):
        return error_response(
            message="HTTP method is not allowed for this endpoint.",
            status_code=405,
            code="METHOD_NOT_ALLOWED",
        )

    @app.errorhandler(500)
    def handle_internal_error(_err):
        return error_response(
            message="An unexpected internal server error occurred.",
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
        )

    return app
