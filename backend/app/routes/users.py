from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response
from app.utils.validators import (
    require_json_body,
    validate_non_empty_str,
    validate_email,
    validate_phone,
)


@api_bp.route("/users", methods=["GET"])
def list_or_lookup_users():
    """Retrieve all registered guests or filter by email/phone."""
    email = request.args.get("email", "").strip()
    phone = request.args.get("phone", "").strip()

    conditions = []
    params = []

    if email:
        conditions.append("LOWER(u.`Email`) = LOWER(%s)")
        params.append(email)
    if phone:
        conditions.append("u.`Phone` = %s")
        params.append(phone)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            u.`U-ID` AS u_id,
            u.`Name` AS name,
            u.`Phone` AS phone,
            u.`Email` AS email,
            COUNT(DISTINCT b.`B-ID`) AS total_bookings,
            COUNT(DISTINCT n.`N-ID`) AS total_notifications
        FROM `User` u
        LEFT JOIN `Bookings` b ON u.`U-ID` = b.`U-ID`
        LEFT JOIN `Notification` n ON u.`U-ID` = n.`U-ID`
        {where_clause}
        GROUP BY u.`U-ID`, u.`Name`, u.`Phone`, u.`Email`
        ORDER BY u.`U-ID` ASC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        users = cursor.fetchall()

    return success_response(data=users, meta={"count": len(users)})


@api_bp.route("/users/<int:u_id>", methods=["GET"])
def get_user_profile(u_id):
    """Retrieve a guest's profile along with their bookings, invoices, reviews, and notifications counts."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT `U-ID` AS u_id, `Name` AS name, `Phone` AS phone, `Email` AS email
            FROM `User` WHERE `U-ID` = %s
            """,
            (u_id,),
        )
        user = cursor.fetchone()
        if not user:
            return error_response(f"User #{u_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM `Bookings` WHERE `U-ID` = %s) AS bookings_count,
                (SELECT COUNT(*) FROM `Invoices` WHERE `U-ID` = %s) AS invoices_count,
                (SELECT COUNT(*) FROM `Reviews` WHERE `U-ID` = %s) AS reviews_count,
                (SELECT COUNT(*) FROM `Notification` WHERE `U-ID` = %s) AS notifications_count
            """,
            (u_id, u_id, u_id, u_id),
        )
        counts = cursor.fetchone()

    user["summary"] = counts
    return success_response(data=user)


@api_bp.route("/users", methods=["POST"])
def create_user():
    """Register a new guest in the User table (or return existing if lookup_or_create=True)."""
    body = require_json_body(request.get_json(silent=True))
    name = validate_non_empty_str(body.get("name") or body.get("Name"), "name", min_len=2, max_len=100)
    phone = validate_phone(body.get("phone") or body.get("Phone"))
    email = validate_email(body.get("email") or body.get("Email"))
    lookup_or_create = bool(body.get("lookup_or_create", False))

    with db_transaction() as (_, cursor):
        cursor.execute(
            """
            SELECT `U-ID` AS u_id, `Name` AS name, `Phone` AS phone, `Email` AS email
            FROM `User`
            WHERE LOWER(`Email`) = LOWER(%s) OR `Phone` = %s
            """,
            (email, phone),
        )
        existing = cursor.fetchone()
        if existing:
            if lookup_or_create:
                return success_response(
                    data=existing,
                    message="Existing guest profile matched.",
                    status_code=200,
                )
            return error_response(
                "A guest with this Email or Phone is already registered.",
                status_code=409,
                code="DUPLICATE_USER",
            )

        cursor.execute(
            """
            INSERT INTO `User` (`Name`, `Phone`, `Email`)
            VALUES (%s, %s, %s)
            """,
            (name, phone, email),
        )
        new_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT `U-ID` AS u_id, `Name` AS name, `Phone` AS phone, `Email` AS email
            FROM `User` WHERE `U-ID` = %s
            """,
            (new_id,),
        )
        created = cursor.fetchone()

    return success_response(
        data=created,
        message="Guest registered successfully.",
        status_code=201,
    )


@api_bp.route("/users/<int:u_id>", methods=["PUT"])
def update_user(u_id):
    """Update an existing guest's contact information."""
    body = require_json_body(request.get_json(silent=True))
    name = validate_non_empty_str(body.get("name") or body.get("Name"), "name", min_len=2, max_len=100)
    phone = validate_phone(body.get("phone") or body.get("Phone"))
    email = validate_email(body.get("email") or body.get("Email"))

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `U-ID` FROM `User` WHERE `U-ID` = %s", (u_id,))
        if not cursor.fetchone():
            return error_response(f"User #{u_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            SELECT `U-ID` FROM `User`
            WHERE (LOWER(`Email`) = LOWER(%s) OR `Phone` = %s) AND `U-ID` != %s
            """,
            (email, phone, u_id),
        )
        if cursor.fetchone():
            return error_response(
                "Another guest is already registered with that Email or Phone.",
                status_code=409,
                code="DUPLICATE_USER",
            )

        cursor.execute(
            """
            UPDATE `User`
            SET `Name` = %s, `Phone` = %s, `Email` = %s
            WHERE `U-ID` = %s
            """,
            (name, phone, email, u_id),
        )
        cursor.execute(
            """
            SELECT `U-ID` AS u_id, `Name` AS name, `Phone` AS phone, `Email` AS email
            FROM `User` WHERE `U-ID` = %s
            """,
            (u_id,),
        )
        updated = cursor.fetchone()

    return success_response(data=updated, message="Guest profile updated successfully.")
