from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response, ValidationError
from app.utils.validators import (
    require_json_body,
    validate_positive_int,
    validate_non_empty_str,
)
from app.utils.auth import require_admin


@api_bp.route("/reviews", methods=["GET"])
def list_reviews():
    """Retrieve guest reviews with user, room/service, and location details."""
    s_id = request.args.get("s_id")
    l_id = request.args.get("l_id")
    u_id = request.args.get("u_id")

    conditions = []
    params = []

    if s_id:
        conditions.append("r.`S-ID` = %s")
        params.append(validate_positive_int(s_id, "s_id"))
    if l_id:
        conditions.append("s.`L-ID` = %s")
        params.append(validate_positive_int(l_id, "l_id"))
    if u_id:
        conditions.append("r.`U-ID` = %s")
        params.append(validate_positive_int(u_id, "u_id"))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            r.`R-ID` AS r_id,
            r.`U-ID` AS u_id,
            u.`Name` AS user_name,
            r.`S-ID` AS s_id,
            s.`Name` AS service_name,
            s.`Category` AS service_category,
            l.`L-ID` AS l_id,
            l.`Name` AS location_name,
            l.`City` AS city,
            r.`Rating` AS rating,
            r.`Comment` AS comment
        FROM `Reviews` r
        INNER JOIN `User` u ON r.`U-ID` = u.`U-ID`
        INNER JOIN `Services` s ON r.`S-ID` = s.`S-ID`
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        {where_clause}
        ORDER BY r.`R-ID` DESC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        reviews = cursor.fetchall()

    return success_response(data=reviews, meta={"count": len(reviews)})


@api_bp.route("/reviews", methods=["POST"])
def create_review():
    """Submit a new review for a room or service (Rating 1 to 5)."""
    body = require_json_body(request.get_json(silent=True))
    u_id = validate_positive_int(body.get("u_id") or body.get("U-ID"), "u_id")
    s_id = validate_positive_int(body.get("s_id") or body.get("S-ID"), "s_id")
    rating = validate_positive_int(body.get("rating") or body.get("Rating"), "rating", min_val=1)
    if rating > 5:
        raise ValidationError("'rating' must be between 1 and 5.")
    comment = validate_non_empty_str(
        body.get("comment") or body.get("Comment"), "comment", min_len=3, max_len=2000
    )

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `U-ID` FROM `User` WHERE `U-ID` = %s", (u_id,))
        if not cursor.fetchone():
            return error_response(f"User #{u_id} does not exist.", status_code=404, code="USER_NOT_FOUND")

        cursor.execute("SELECT `S-ID`, `Name` FROM `Services` WHERE `S-ID` = %s", (s_id,))
        service = cursor.fetchone()
        if not service:
            return error_response(f"Service #{s_id} does not exist.", status_code=404, code="SERVICE_NOT_FOUND")

        cursor.execute(
            """
            INSERT INTO `Reviews` (`U-ID`, `S-ID`, `Rating`, `Comment`)
            VALUES (%s, %s, %s, %s)
            """,
            (u_id, s_id, rating, comment),
        )
        new_r_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT
                r.`R-ID` AS r_id,
                r.`U-ID` AS u_id,
                u.`Name` AS user_name,
                r.`S-ID` AS s_id,
                s.`Name` AS service_name,
                r.`Rating` AS rating,
                r.`Comment` AS comment
            FROM `Reviews` r
            INNER JOIN `User` u ON r.`U-ID` = u.`U-ID`
            INNER JOIN `Services` s ON r.`S-ID` = s.`S-ID`
            WHERE r.`R-ID` = %s
            """,
            (new_r_id,),
        )
        created = cursor.fetchone()

    return success_response(
        data=created,
        message="Review submitted successfully.",
        status_code=201,
    )


@api_bp.route("/reviews/<int:r_id>", methods=["DELETE"])
@require_admin
def delete_review(r_id):
    """Administrative endpoint to delete a review."""
    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `R-ID` FROM `Reviews` WHERE `R-ID` = %s", (r_id,))
        if not cursor.fetchone():
            return error_response(f"Review #{r_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute("DELETE FROM `Reviews` WHERE `R-ID` = %s", (r_id,))

    return success_response(message=f"Review #{r_id} deleted successfully.")


@api_bp.route("/notifications", methods=["GET"])
def list_notifications():
    """Retrieve notifications, optionally filtered by u_id."""
    u_id = request.args.get("u_id")

    conditions = []
    params = []
    if u_id:
        conditions.append("n.`U-ID` = %s")
        params.append(validate_positive_int(u_id, "u_id"))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            n.`N-ID` AS n_id,
            n.`U-ID` AS u_id,
            u.`Name` AS user_name,
            u.`Email` AS user_email,
            n.`Message` AS message
        FROM `Notification` n
        INNER JOIN `User` u ON n.`U-ID` = u.`U-ID`
        {where_clause}
        ORDER BY n.`N-ID` DESC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        notifications = cursor.fetchall()

    return success_response(data=notifications, meta={"count": len(notifications)})


@api_bp.route("/notifications", methods=["POST"])
@require_admin
def create_notification():
    """Administrative endpoint to send a notification to a specific user."""
    body = require_json_body(request.get_json(silent=True))
    u_id = validate_positive_int(body.get("u_id") or body.get("U-ID"), "u_id")
    message = validate_non_empty_str(
        body.get("message") or body.get("Message"), "message", min_len=3, max_len=500
    )

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `U-ID`, `Name` FROM `User` WHERE `U-ID` = %s", (u_id,))
        user = cursor.fetchone()
        if not user:
            return error_response(f"User #{u_id} does not exist.", status_code=404, code="USER_NOT_FOUND")

        cursor.execute(
            "INSERT INTO `Notification` (`U-ID`, `Message`) VALUES (%s, %s)",
            (u_id, message),
        )
        new_n_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT n.`N-ID` AS n_id, n.`U-ID` AS u_id, u.`Name` AS user_name, n.`Message` AS message
            FROM `Notification` n
            INNER JOIN `User` u ON n.`U-ID` = u.`U-ID`
            WHERE n.`N-ID` = %s
            """,
            (new_n_id,),
        )
        created = cursor.fetchone()

    return success_response(
        data=created,
        message="Notification sent successfully.",
        status_code=201,
    )
