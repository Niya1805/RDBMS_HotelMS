from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response
from app.utils.validators import require_json_body, validate_non_empty_str
from app.utils.auth import require_admin


@api_bp.route("/locations", methods=["GET"])
def list_locations():
    """Retrieve all hotel locations with room/add-on counts and average rating."""
    city_filter = request.args.get("city", "").strip()

    query = """
        SELECT
            l.`L-ID` AS l_id,
            l.`Name` AS name,
            l.`Address` AS address,
            l.`City` AS city,
            l.`Country` AS country,
            COUNT(DISTINCT CASE WHEN s.`Category` = 'Room' THEN s.`S-ID` END) AS room_types_count,
            COUNT(DISTINCT CASE WHEN s.`Category` = 'Add-On' THEN s.`S-ID` END) AS addon_services_count,
            COALESCE(SUM(CASE WHEN s.`Category` = 'Room' THEN s.`Total_Units` ELSE 0 END), 0) AS total_room_units,
            MIN(CASE WHEN s.`Category` = 'Room' THEN s.`Price` END) AS starting_room_price,
            ROUND(AVG(r.`Rating`), 2) AS avg_rating,
            COUNT(r.`R-ID`) AS review_count
        FROM `Location` l
        LEFT JOIN `Services` s ON l.`L-ID` = s.`L-ID`
        LEFT JOIN `Reviews` r ON s.`S-ID` = r.`S-ID`
    """
    params = []
    if city_filter:
        query += " WHERE LOWER(l.`City`) LIKE LOWER(%s)"
        params.append(f"%{city_filter}%")

    query += """
        GROUP BY l.`L-ID`, l.`Name`, l.`Address`, l.`City`, l.`Country`
        ORDER BY l.`L-ID` ASC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        locations = cursor.fetchall()

    return success_response(data=locations, meta={"count": len(locations)})


@api_bp.route("/locations/<int:l_id>", methods=["GET"])
def get_location(l_id):
    """Retrieve a single hotel location along with all its rooms and add-on services."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                `L-ID` AS l_id,
                `Name` AS name,
                `Address` AS address,
                `City` AS city,
                `Country` AS country
            FROM `Location`
            WHERE `L-ID` = %s
            """,
            (l_id,),
        )
        location = cursor.fetchone()
        if not location:
            return error_response(f"Location #{l_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            SELECT
                s.`S-ID` AS s_id,
                s.`Name` AS name,
                s.`Price` AS price,
                s.`Description` AS description,
                s.`L-ID` AS l_id,
                s.`Category` AS category,
                s.`Max_Guests` AS max_guests,
                s.`Total_Units` AS total_units,
                ROUND(AVG(r.`Rating`), 2) AS avg_rating,
                COUNT(r.`R-ID`) AS review_count
            FROM `Services` s
            LEFT JOIN `Reviews` r ON s.`S-ID` = r.`S-ID`
            WHERE s.`L-ID` = %s
            GROUP BY
                s.`S-ID`, s.`Name`, s.`Price`, s.`Description`,
                s.`L-ID`, s.`Category`, s.`Max_Guests`, s.`Total_Units`
            ORDER BY s.`Category` ASC, s.`Price` ASC
            """,
            (l_id,),
        )
        services = cursor.fetchall()

    location["services"] = services
    return success_response(data=location)


@api_bp.route("/locations", methods=["POST"])
@require_admin
def create_location():
    """Administrative endpoint to add a new hotel branch/location."""
    body = require_json_body(request.get_json(silent=True))
    name = validate_non_empty_str(body.get("name") or body.get("Name"), "name", min_len=2, max_len=120)
    address = validate_non_empty_str(body.get("address") or body.get("Address"), "address", min_len=5, max_len=255)
    city = validate_non_empty_str(body.get("city") or body.get("City"), "city", min_len=2, max_len=80)
    country = validate_non_empty_str(
        body.get("country") or body.get("Country") or "India", "country", min_len=2, max_len=80
    )

    with db_transaction() as (_, cursor):
        cursor.execute(
            """
            INSERT INTO `Location` (`Name`, `Address`, `City`, `Country`)
            VALUES (%s, %s, %s, %s)
            """,
            (name, address, city, country),
        )
        new_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT `L-ID` AS l_id, `Name` AS name, `Address` AS address, `City` AS city, `Country` AS country
            FROM `Location` WHERE `L-ID` = %s
            """,
            (new_id,),
        )
        created = cursor.fetchone()

    return success_response(
        data=created,
        message="Hotel location created successfully.",
        status_code=201,
    )


@api_bp.route("/locations/<int:l_id>", methods=["PUT"])
@require_admin
def update_location(l_id):
    """Administrative endpoint to update an existing hotel location."""
    body = require_json_body(request.get_json(silent=True))
    name = validate_non_empty_str(body.get("name") or body.get("Name"), "name", min_len=2, max_len=120)
    address = validate_non_empty_str(body.get("address") or body.get("Address"), "address", min_len=5, max_len=255)
    city = validate_non_empty_str(body.get("city") or body.get("City"), "city", min_len=2, max_len=80)
    country = validate_non_empty_str(
        body.get("country") or body.get("Country") or "India", "country", min_len=2, max_len=80
    )

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `L-ID` FROM `Location` WHERE `L-ID` = %s", (l_id,))
        if not cursor.fetchone():
            return error_response(f"Location #{l_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            UPDATE `Location`
            SET `Name` = %s, `Address` = %s, `City` = %s, `Country` = %s
            WHERE `L-ID` = %s
            """,
            (name, address, city, country, l_id),
        )
        cursor.execute(
            """
            SELECT `L-ID` AS l_id, `Name` AS name, `Address` AS address, `City` AS city, `Country` AS country
            FROM `Location` WHERE `L-ID` = %s
            """,
            (l_id,),
        )
        updated = cursor.fetchone()

    return success_response(data=updated, message="Hotel location updated successfully.")
