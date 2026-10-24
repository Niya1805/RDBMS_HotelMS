from decimal import Decimal
from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response
from app.utils.validators import (
    require_json_body,
    validate_non_empty_str,
    validate_positive_int,
    validate_decimal_amount,
    validate_date_range,
    validate_enum,
    VALID_CATEGORIES,
)
from app.utils.auth import require_admin


@api_bp.route("/services", methods=["GET"])
def list_services():
    """Retrieve rooms and/or add-on services with location details and rating summaries."""
    l_id = request.args.get("l_id")
    city = request.args.get("city", "").strip()
    category = request.args.get("category", "").strip()
    guests = request.args.get("guests")
    max_price = request.args.get("max_price")

    conditions = []
    params = []

    if l_id:
        conditions.append("s.`L-ID` = %s")
        params.append(validate_positive_int(l_id, "l_id"))
    if city:
        conditions.append("LOWER(l.`City`) LIKE LOWER(%s)")
        params.append(f"%{city}%")
    if category:
        validate_enum(category, "category", VALID_CATEGORIES)
        conditions.append("s.`Category` = %s")
        params.append(category)
    if guests:
        conditions.append("s.`Max_Guests` >= %s")
        params.append(validate_positive_int(guests, "guests"))
    if max_price:
        conditions.append("s.`Price` <= %s")
        params.append(validate_decimal_amount(max_price, "max_price"))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            s.`S-ID` AS s_id,
            s.`Name` AS name,
            s.`Price` AS price,
            s.`Description` AS description,
            s.`L-ID` AS l_id,
            s.`Category` AS category,
            s.`Max_Guests` AS max_guests,
            s.`Total_Units` AS total_units,
            l.`Name` AS location_name,
            l.`Address` AS location_address,
            l.`City` AS city,
            l.`Country` AS country,
            ROUND(AVG(r.`Rating`), 2) AS avg_rating,
            COUNT(r.`R-ID`) AS review_count
        FROM `Services` s
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        LEFT JOIN `Reviews` r ON s.`S-ID` = r.`S-ID`
        {where_clause}
        GROUP BY
            s.`S-ID`, s.`Name`, s.`Price`, s.`Description`,
            s.`L-ID`, s.`Category`, s.`Max_Guests`, s.`Total_Units`,
            l.`Name`, l.`Address`, l.`City`, l.`Country`
        ORDER BY s.`L-ID` ASC, s.`Category` ASC, s.`Price` ASC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        services = cursor.fetchall()

    return success_response(data=services, meta={"count": len(services)})


@api_bp.route("/services/available", methods=["GET"])
def search_available_services():
    """
    Search available rooms/services for a selected location, check-in date,
    check-out date, and guest count. Cancelled bookings do not block availability.
    """
    check_in_raw = request.args.get("check_in")
    check_out_raw = request.args.get("check_out")
    guests_raw = request.args.get("guests", "1")
    l_id_raw = request.args.get("l_id")
    city = request.args.get("city", "").strip()
    category = request.args.get("category", "Room").strip()
    include_sold_out = request.args.get("include_sold_out", "false").lower() in ("true", "1")

    check_in, check_out = validate_date_range(check_in_raw, check_out_raw)
    guests = validate_positive_int(guests_raw, "guests", min_val=1)
    nights = (check_out - check_in).days

    conditions = ["s.`Max_Guests` >= %s"]
    params = [check_out, check_in, guests]

    if l_id_raw:
        conditions.append("s.`L-ID` = %s")
        params.append(validate_positive_int(l_id_raw, "l_id"))
    if city:
        conditions.append("LOWER(l.`City`) LIKE LOWER(%s)")
        params.append(f"%{city}%")
    if category and category.lower() != "all":
        validate_enum(category, "category", VALID_CATEGORIES)
        conditions.append("s.`Category` = %s")
        params.append(category)

    where_clause = " AND ".join(conditions)
    having_clause = "" if include_sold_out else "HAVING available_units > 0"

    query = f"""
        SELECT
            s.`S-ID` AS s_id,
            s.`Name` AS name,
            s.`Price` AS price,
            s.`Description` AS description,
            s.`L-ID` AS l_id,
            s.`Category` AS category,
            s.`Max_Guests` AS max_guests,
            s.`Total_Units` AS total_units,
            l.`Name` AS location_name,
            l.`Address` AS location_address,
            l.`City` AS city,
            l.`Country` AS country,
            COUNT(DISTINCT b.`B-ID`) AS active_overlapping_bookings,
            (s.`Total_Units` - COUNT(DISTINCT b.`B-ID`)) AS available_units,
            (SELECT ROUND(AVG(r.`Rating`), 2) FROM `Reviews` r WHERE r.`S-ID` = s.`S-ID`) AS avg_rating,
            (SELECT COUNT(r.`R-ID`) FROM `Reviews` r WHERE r.`S-ID` = s.`S-ID`) AS review_count
        FROM `Services` s
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        LEFT JOIN `Bookings` b
            ON s.`S-ID` = b.`S-ID`
            AND b.`Status` IN ('Pending', 'Confirmed')
            AND b.`Check_In` < %s
            AND b.`Check_Out` > %s
        WHERE {where_clause}
        GROUP BY
            s.`S-ID`, s.`Name`, s.`Price`, s.`Description`,
            s.`L-ID`, s.`Category`, s.`Max_Guests`, s.`Total_Units`,
            l.`Name`, l.`Address`, l.`City`, l.`Country`
        {having_clause}
        ORDER BY s.`Price` ASC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

    for row in rows:
        unit_price = Decimal(str(row["price"]))
        row["nights"] = nights
        row["estimated_total_price"] = float(
            unit_price * nights if row["category"] == "Room" else unit_price
        )
        row["is_available"] = int(row["available_units"]) > 0

    return success_response(
        data=rows,
        meta={
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "nights": nights,
            "guests": guests,
            "count": len(rows),
        },
    )


@api_bp.route("/services/<int:s_id>", methods=["GET"])
def get_service_details(s_id):
    """Retrieve complete details of a room or add-on service including location and reviews."""
    with db_cursor() as cursor:
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
                l.`Name` AS location_name,
                l.`Address` AS location_address,
                l.`City` AS city,
                l.`Country` AS country,
                ROUND(AVG(r.`Rating`), 2) AS avg_rating,
                COUNT(r.`R-ID`) AS review_count
            FROM `Services` s
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            LEFT JOIN `Reviews` r ON s.`S-ID` = r.`S-ID`
            WHERE s.`S-ID` = %s
            GROUP BY
                s.`S-ID`, s.`Name`, s.`Price`, s.`Description`,
                s.`L-ID`, s.`Category`, s.`Max_Guests`, s.`Total_Units`,
                l.`Name`, l.`Address`, l.`City`, l.`Country`
            """,
            (s_id,),
        )
        service = cursor.fetchone()
        if not service:
            return error_response(f"Service #{s_id} not found.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            SELECT
                r.`R-ID` AS r_id,
                r.`U-ID` AS u_id,
                u.`Name` AS user_name,
                r.`S-ID` AS s_id,
                r.`Rating` AS rating,
                r.`Comment` AS comment
            FROM `Reviews` r
            INNER JOIN `User` u ON r.`U-ID` = u.`U-ID`
            WHERE r.`S-ID` = %s
            ORDER BY r.`R-ID` DESC
            """,
            (s_id,),
        )
        reviews = cursor.fetchall()

    service["reviews"] = reviews
    return success_response(data=service)


@api_bp.route("/services/<int:s_id>/availability", methods=["GET"])
def check_single_service_availability(s_id):
    """Check exact availability and price quote for a specific room/service and date range."""
    check_in_raw = request.args.get("check_in")
    check_out_raw = request.args.get("check_out")
    guests_raw = request.args.get("guests", "1")

    check_in, check_out = validate_date_range(check_in_raw, check_out_raw)
    guests = validate_positive_int(guests_raw, "guests", min_val=1)
    nights = (check_out - check_in).days

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                s.`S-ID` AS s_id,
                s.`Name` AS name,
                s.`Price` AS price,
                s.`Category` AS category,
                s.`Max_Guests` AS max_guests,
                s.`Total_Units` AS total_units,
                COUNT(b.`B-ID`) AS active_overlapping_bookings
            FROM `Services` s
            LEFT JOIN `Bookings` b
                ON s.`S-ID` = b.`S-ID`
                AND b.`Status` IN ('Pending', 'Confirmed')
                AND b.`Check_In` < %s
                AND b.`Check_Out` > %s
            WHERE s.`S-ID` = %s
            GROUP BY s.`S-ID`, s.`Name`, s.`Price`, s.`Category`, s.`Max_Guests`, s.`Total_Units`
            """,
            (check_out, check_in, s_id),
        )
        row = cursor.fetchone()

    if not row:
        return error_response(f"Service #{s_id} not found.", status_code=404, code="NOT_FOUND")

    available_units = max(0, int(row["total_units"]) - int(row["active_overlapping_bookings"]))
    capacity_ok = guests <= int(row["max_guests"])
    is_available = available_units > 0 and capacity_ok
    unit_price = Decimal(str(row["price"]))
    total_price = unit_price * nights if row["category"] == "Room" else unit_price

    return success_response(
        data={
            "s_id": row["s_id"],
            "name": row["name"],
            "category": row["category"],
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "nights": nights,
            "requested_guests": guests,
            "max_guests": row["max_guests"],
            "capacity_ok": capacity_ok,
            "total_units": row["total_units"],
            "active_overlapping_bookings": row["active_overlapping_bookings"],
            "available_units": available_units,
            "is_available": is_available,
            "unit_price": float(unit_price),
            "estimated_total_price": float(total_price),
        }
    )


@api_bp.route("/services", methods=["POST"])
@require_admin
def create_service():
    """Administrative endpoint to add a new room or hotel service."""
    body = require_json_body(request.get_json(silent=True))
    name = validate_non_empty_str(body.get("name") or body.get("Name"), "name", min_len=2, max_len=120)
    price = validate_decimal_amount(body.get("price") if "price" in body else body.get("Price"), "price")
    description = validate_non_empty_str(
        body.get("description") or body.get("Description"), "description", min_len=5, max_len=2000
    )
    l_id = validate_positive_int(body.get("l_id") or body.get("L-ID"), "l_id")
    category = validate_enum(
        body.get("category") or body.get("Category") or "Room", "category", VALID_CATEGORIES
    )
    max_guests = validate_positive_int(
        body.get("max_guests") if "max_guests" in body else body.get("Max_Guests", 2),
        "max_guests",
        min_val=1,
    )
    total_units = validate_positive_int(
        body.get("total_units") if "total_units" in body else body.get("Total_Units", 1),
        "total_units",
        min_val=1,
    )

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `L-ID` FROM `Location` WHERE `L-ID` = %s", (l_id,))
        if not cursor.fetchone():
            return error_response(f"Location #{l_id} does not exist.", status_code=404, code="NOT_FOUND")

        cursor.execute(
            """
            INSERT INTO `Services` (`Name`, `Price`, `Description`, `L-ID`, `Category`, `Max_Guests`, `Total_Units`)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (name, price, description, l_id, category, max_guests, total_units),
        )
        new_id = cursor.lastrowid
        cursor.execute(
            """
            SELECT
                `S-ID` AS s_id, `Name` AS name, `Price` AS price, `Description` AS description,
                `L-ID` AS l_id, `Category` AS category, `Max_Guests` AS max_guests, `Total_Units` AS total_units
            FROM `Services` WHERE `S-ID` = %s
            """,
            (new_id,),
        )
        created = cursor.fetchone()

    return success_response(
        data=created,
        message="Room/service created successfully.",
        status_code=201,
    )


@api_bp.route("/services/<int:s_id>", methods=["PUT"])
@require_admin
def update_service(s_id):
    """Administrative endpoint to update room/service details, pricing, capacity, or inventory."""
    body = require_json_body(request.get_json(silent=True))

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT * FROM `Services` WHERE `S-ID` = %s", (s_id,))
        existing = cursor.fetchone()
        if not existing:
            return error_response(f"Service #{s_id} not found.", status_code=404, code="NOT_FOUND")

        name = validate_non_empty_str(
            body.get("name") or body.get("Name") or existing["Name"], "name", min_len=2, max_len=120
        )
        raw_price = body.get("price", body.get("Price", existing["Price"]))
        price = validate_decimal_amount(raw_price, "price")
        description = validate_non_empty_str(
            body.get("description") or body.get("Description") or existing["Description"],
            "description",
            min_len=5,
            max_len=2000,
        )
        l_id = validate_positive_int(
            body.get("l_id") or body.get("L-ID") or existing["L-ID"], "l_id"
        )
        category = validate_enum(
            body.get("category") or body.get("Category") or existing["Category"],
            "category",
            VALID_CATEGORIES,
        )
        max_guests = validate_positive_int(
            body.get("max_guests", body.get("Max_Guests", existing["Max_Guests"])),
            "max_guests",
            min_val=1,
        )
        total_units = validate_positive_int(
            body.get("total_units", body.get("Total_Units", existing["Total_Units"])),
            "total_units",
            min_val=1,
        )

        cursor.execute(
            """
            UPDATE `Services`
            SET `Name` = %s, `Price` = %s, `Description` = %s,
                `L-ID` = %s, `Category` = %s, `Max_Guests` = %s, `Total_Units` = %s
            WHERE `S-ID` = %s
            """,
            (name, price, description, l_id, category, max_guests, total_units, s_id),
        )
        cursor.execute(
            """
            SELECT
                `S-ID` AS s_id, `Name` AS name, `Price` AS price, `Description` AS description,
                `L-ID` AS l_id, `Category` AS category, `Max_Guests` AS max_guests, `Total_Units` AS total_units
            FROM `Services` WHERE `S-ID` = %s
            """,
            (s_id,),
        )
        updated = cursor.fetchone()

    return success_response(data=updated, message="Room/service updated successfully.")
