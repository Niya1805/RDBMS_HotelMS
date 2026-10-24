import os
from contextlib import contextmanager
from datetime import date, datetime
from decimal import Decimal
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error as MySQLError
from flask import current_app
from app.config import Config

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
_ENV_PATH = os.path.join(_BACKEND_DIR, ".env")


class DatabaseError(Exception):
    """Sanitized database exception that never exposes credentials or stack traces."""

    def __init__(self, public_message="A database error occurred.", status_code=500, code="DB_ERROR"):
        super().__init__(public_message)
        self.public_message = public_message
        self.status_code = status_code
        self.code = code


def _get_live_db_credentials():
    """Reload backend/.env dynamically so saving backend/.env takes effect immediately."""
    load_dotenv(_ENV_PATH, override=True)
    return {
        "host": os.getenv("DB_HOST", Config.DB_HOST),
        "port": int(os.getenv("DB_PORT", str(Config.DB_PORT))),
        "user": os.getenv("DB_USER", Config.DB_USER),
        "password": os.getenv("DB_PASSWORD", Config.DB_PASSWORD),
        "db_name": os.getenv("DB_NAME", Config.DB_NAME),
    }


def get_active_db_name():
    """Return the active database name (uses TEST_DB_NAME when Flask TESTING is enabled)."""
    try:
        if current_app and current_app.config.get("TESTING"):
            return current_app.config.get("TEST_DB_NAME", Config.TEST_DB_NAME)
    except RuntimeError:
        pass
    creds = _get_live_db_credentials()
    return creds["db_name"]


def _execute_sql_file(cursor, filepath):
    """Execute a multi-statement SQL file (schema.sql or seed.sql) statement by statement."""
    if not os.path.exists(filepath):
        return
    with open(filepath, "r", encoding="utf-8") as f:
        lines = []
        for line in f:
            stripped = line.strip()
            if not stripped or stripped.startswith("--"):
                continue
            lines.append(line)
        content = "".join(lines)
        for statement in content.split(";"):
            stmt = statement.strip()
            if stmt:
                cursor.execute(stmt)


def _auto_bootstrap_database_if_needed(creds, target_db):
    """If MySQL credentials are valid but hotel_reservation_db or its tables are not yet created, bootstrap them."""
    conn = mysql.connector.connect(
        host=creds["host"],
        port=creds["port"],
        user=creds["user"],
        password=creds["password"],
        autocommit=True,
    )
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{target_db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
        )
        cursor.execute(f"USE `{target_db}`;")
        cursor.execute("SHOW TABLES;")
        existing = cursor.fetchall()
        if len(existing) < 9:
            schema_path = os.path.join(_PROJECT_ROOT, "database", "schema.sql")
            seed_path = os.path.join(_PROJECT_ROOT, "database", "seed.sql")
            _execute_sql_file(cursor, schema_path)
            _execute_sql_file(cursor, seed_path)
    finally:
        cursor.close()
        conn.close()


def get_db_connection(database=None):
    """Create and return a new MySQL 8 connection using live environment configuration."""
    creds = _get_live_db_credentials()
    target_db = database if database is not None else get_active_db_name()
    try:
        conn = mysql.connector.connect(
            host=creds["host"],
            port=creds["port"],
            user=creds["user"],
            password=creds["password"],
            database=target_db,
            autocommit=False,
        )
        return conn
    except MySQLError as err:
        errno = getattr(err, "errno", None)
        # If the database does not exist yet (errno 1049), auto-run schema.sql & seed.sql!
        if errno == 1049:
            try:
                _auto_bootstrap_database_if_needed(creds, target_db)
                return mysql.connector.connect(
                    host=creds["host"],
                    port=creds["port"],
                    user=creds["user"],
                    password=creds["password"],
                    database=target_db,
                    autocommit=False,
                )
            except MySQLError:
                pass

        if errno == 1045:
            raise DatabaseError(
                public_message="MySQL authentication failed (Access denied). Please save your actual MySQL root password in backend/.env under DB_PASSWORD=...",
                status_code=503,
                code="DB_UNAVAILABLE",
            ) from None
        if errno in (2003, 1049):
            raise DatabaseError(
                public_message="Database service is currently unavailable or not configured.",
                status_code=503,
                code="DB_UNAVAILABLE",
            ) from None
        raise DatabaseError(
            public_message="Failed to establish a database connection.",
            status_code=503,
            code="DB_CONNECTION_FAILED",
        ) from None


def serialize_row(row):
    """Convert Decimal, date, and datetime objects in a dictionary row into JSON-safe primitives."""
    if row is None:
        return None
    if isinstance(row, list):
        return [serialize_row(item) for item in row]
    if not isinstance(row, dict):
        return row
    out = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            out[k] = float(v)
        elif isinstance(v, (datetime, date)):
            out[k] = v.isoformat(sep=" ") if isinstance(v, datetime) else v.isoformat()
        else:
            out[k] = v
    return out


@contextmanager
def db_cursor(dictionary=True):
    """Context manager for read-only parameterized SQL queries."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor
    except MySQLError as err:
        _handle_mysql_error(err)
    finally:
        cursor.close()
        conn.close()


@contextmanager
def db_transaction(dictionary=True):
    """Context manager for atomic multi-statement transactions (COMMIT on success, ROLLBACK on error)."""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield conn, cursor
        conn.commit()
    except DatabaseError:
        conn.rollback()
        raise
    except MySQLError as err:
        conn.rollback()
        _handle_mysql_error(err)
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def _handle_mysql_error(err):
    """Map MySQL error codes to safe, descriptive client errors without exposing internal details."""
    errno = getattr(err, "errno", None)
    if errno == 1062:
        raise DatabaseError(
            public_message="A record with the provided unique value already exists.",
            status_code=409,
            code="DUPLICATE_ENTRY",
        ) from None
    if errno in (1451, 1452):
        raise DatabaseError(
            public_message="Operation violates relational foreign key integrity constraints.",
            status_code=409,
            code="FOREIGN_KEY_CONSTRAINT",
        ) from None
    if errno == 3819:
        raise DatabaseError(
            public_message="Input violates a database domain CHECK constraint.",
            status_code=400,
            code="CHECK_CONSTRAINT_VIOLATION",
        ) from None
    raise DatabaseError(
        public_message="A database error occurred while processing the request.",
        status_code=500,
        code="DB_QUERY_ERROR",
    ) from None


def verify_database_connection():
    """Verify connectivity to MySQL 8 and inspect which ER entities exist in the schema."""
    creds = _get_live_db_credentials()
    target_db = get_active_db_name()
    try:
        _auto_bootstrap_database_if_needed(creds, target_db)
        conn = mysql.connector.connect(
            host=creds["host"],
            port=creds["port"],
            user=creds["user"],
            password=creds["password"],
            database=target_db,
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT VERSION() AS mysql_version, DATABASE() AS current_db;")
        info = cursor.fetchone()

        cursor.execute("SHOW TABLES;")
        rows = cursor.fetchall()
        existing_tables = [list(row.values())[0] for row in rows] if rows else []

        cursor.close()
        conn.close()
        return {
            "connected": True,
            "mysql_version": info.get("mysql_version") if info else "8.x",
            "database": info.get("current_db") if info else target_db,
            "existing_tables": existing_tables,
            "expected_er_entities": Config.ER_ENTITIES,
        }
    except MySQLError:
        return {
            "connected": False,
            "database": target_db,
            "expected_er_entities": Config.ER_ENTITIES,
            "error": "MySQL authentication failed or server unreachable. Ensure you saved your MySQL root password in backend/.env (Ctrl+S).",
        }
