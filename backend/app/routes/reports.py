from datetime import date, timedelta
from flask import request
from app.routes import api_bp
from app.db import db_cursor
from app.utils.responses import success_response
from app.utils.validators import validate_date_range


@api_bp.route("/cancellations", methods=["GET"])
def list_cancellations():
    """Retrieve all recorded cancellations and refund details."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                c.`C-ID` AS c_id,
                c.`B-ID` AS b_id,
                c.`Date` AS date,
                c.`Refund-amt` AS refund_amt,
                b.`U-ID` AS u_id,
                u.`Name` AS user_name,
                u.`Email` AS user_email,
                b.`S-ID` AS s_id,
                s.`Name` AS service_name,
                s.`Category` AS service_category,
                l.`Name` AS location_name,
                l.`City` AS city,
                b.`Check_In` AS check_in,
                b.`Check_Out` AS check_out,
                b.`Status` AS booking_status,
                (SELECT COALESCE(SUM(p.`Amt`), 0.00) FROM `Payment` p WHERE p.`B-ID` = b.`B-ID`) AS original_paid_amt
            FROM `Cancellation` c
            INNER JOIN `Bookings` b ON c.`B-ID` = b.`B-ID`
            INNER JOIN `User` u ON b.`U-ID` = u.`U-ID`
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            ORDER BY c.`C-ID` DESC
            """
        )
        cancellations = cursor.fetchall()

    return success_response(data=cancellations, meta={"count": len(cancellations)})


@api_bp.route("/reports/summary", methods=["GET"])
def get_summary_report():
    """Aggregate high-level KPIs across all 9 ER tables."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM `User`) AS total_users,
                (SELECT COUNT(*) FROM `Location`) AS total_locations,
                (SELECT COUNT(*) FROM `Services` WHERE `Category` = 'Room') AS total_room_types,
                (SELECT COALESCE(SUM(`Total_Units`), 0) FROM `Services` WHERE `Category` = 'Room') AS total_room_units,
                (SELECT COUNT(*) FROM `Services` WHERE `Category` = 'Add-On') AS total_addon_services,
                (SELECT COUNT(*) FROM `Bookings`) AS total_bookings,
                (SELECT COUNT(*) FROM `Bookings` WHERE `Status` = 'Confirmed') AS confirmed_bookings,
                (SELECT COUNT(*) FROM `Bookings` WHERE `Status` = 'Pending') AS pending_bookings,
                (SELECT COUNT(*) FROM `Bookings` WHERE `Status` = 'Completed') AS completed_bookings,
                (SELECT COUNT(*) FROM `Bookings` WHERE `Status` = 'Cancelled') AS cancelled_bookings,
                (SELECT COALESCE(SUM(`Amt`), 0.00) FROM `Payment`) AS gross_revenue,
                (SELECT COALESCE(SUM(`Refund-amt`), 0.00) FROM `Cancellation`) AS total_refunds,
                (
                    (SELECT COALESCE(SUM(`Amt`), 0.00) FROM `Payment`) -
                    (SELECT COALESCE(SUM(`Refund-amt`), 0.00) FROM `Cancellation`)
                ) AS net_revenue,
                (SELECT ROUND(AVG(`Rating`), 2) FROM `Reviews`) AS overall_avg_rating,
                (SELECT COUNT(*) FROM `Reviews`) AS total_reviews
            """
        )
        summary = cursor.fetchone()

    return success_response(data=summary)


@api_bp.route("/reports/revenue", methods=["GET"])
def get_revenue_report():
    """Provide revenue breakdown by hotel Location, Service Category, and Payment Method."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                l.`L-ID` AS l_id,
                l.`Name` AS location_name,
                l.`City` AS city,
                COUNT(DISTINCT b.`B-ID`) AS total_bookings,
                COALESCE(SUM(p.`Amt`), 0.00) AS gross_revenue,
                COALESCE(SUM(c.`Refund-amt`), 0.00) AS total_refunds,
                (COALESCE(SUM(p.`Amt`), 0.00) - COALESCE(SUM(c.`Refund-amt`), 0.00)) AS net_revenue
            FROM `Location` l
            LEFT JOIN `Services` s ON l.`L-ID` = s.`L-ID`
            LEFT JOIN `Bookings` b ON s.`S-ID` = b.`S-ID`
            LEFT JOIN `Payment` p ON b.`B-ID` = p.`B-ID`
            LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
            GROUP BY l.`L-ID`, l.`Name`, l.`City`
            ORDER BY net_revenue DESC
            """
        )
        by_location = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                s.`Category` AS category,
                COUNT(DISTINCT b.`B-ID`) AS bookings_count,
                COALESCE(SUM(p.`Amt`), 0.00) AS gross_revenue,
                COALESCE(SUM(c.`Refund-amt`), 0.00) AS total_refunds,
                (COALESCE(SUM(p.`Amt`), 0.00) - COALESCE(SUM(c.`Refund-amt`), 0.00)) AS net_revenue
            FROM `Services` s
            LEFT JOIN `Bookings` b ON s.`S-ID` = b.`S-ID`
            LEFT JOIN `Payment` p ON b.`B-ID` = p.`B-ID`
            LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
            GROUP BY s.`Category`
            ORDER BY net_revenue DESC
            """
        )
        by_category = cursor.fetchall()

        cursor.execute(
            """
            SELECT
                p.`Method` AS method,
                COUNT(p.`P-ID`) AS transaction_count,
                COALESCE(SUM(p.`Amt`), 0.00) AS total_amount
            FROM `Payment` p
            GROUP BY p.`Method`
            ORDER BY total_amount DESC
            """
        )
        by_payment_method = cursor.fetchall()

    return success_response(
        data={
            "by_location": by_location,
            "by_category": by_category,
            "by_payment_method": by_payment_method,
        }
    )


@api_bp.route("/reports/occupancy", methods=["GET"])
def get_occupancy_report():
    """
    Provide room availability and occupancy report across all locations for a specified date window.
    Defaults to a 30-day window starting today if check_in / check_out are not provided.
    """
    today = date.today()
    default_out = today + timedelta(days=30)

    check_in_raw = request.args.get("check_in", today.isoformat())
    check_out_raw = request.args.get("check_out", default_out.isoformat())
    check_in, check_out = validate_date_range(check_in_raw, check_out_raw)

    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                s.`S-ID` AS s_id,
                s.`Name` AS service_name,
                s.`Category` AS category,
                s.`Price` AS price,
                s.`Max_Guests` AS max_guests,
                s.`Total_Units` AS total_units,
                l.`L-ID` AS l_id,
                l.`Name` AS location_name,
                l.`City` AS city,
                COUNT(DISTINCT CASE
                    WHEN b.`Status` IN ('Pending', 'Confirmed')
                     AND b.`Check_In` < %s
                     AND b.`Check_Out` > %s
                    THEN b.`B-ID`
                END) AS active_overlapping_bookings,
                COUNT(DISTINCT CASE
                    WHEN b.`Status` = 'Cancelled'
                     AND b.`Check_In` < %s
                     AND b.`Check_Out` > %s
                    THEN b.`B-ID`
                END) AS cancelled_bookings_in_window
            FROM `Services` s
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            LEFT JOIN `Bookings` b ON s.`S-ID` = b.`S-ID`
            GROUP BY
                s.`S-ID`, s.`Name`, s.`Category`, s.`Price`,
                s.`Max_Guests`, s.`Total_Units`, l.`L-ID`, l.`Name`, l.`City`
            ORDER BY l.`L-ID` ASC, s.`Category` ASC, s.`S-ID` ASC
            """,
            (check_out, check_in, check_out, check_in),
        )
        rows = cursor.fetchall()

    for row in rows:
        total_u = max(1, int(row["total_units"]))
        active_b = int(row["active_overlapping_bookings"])
        avail_u = max(0, total_u - active_b)
        row["available_units"] = avail_u
        row["occupancy_rate_pct"] = round(min(100.0, (active_b / total_u) * 100.0), 1)

    return success_response(
        data=rows,
        meta={
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "count": len(rows),
        },
    )
