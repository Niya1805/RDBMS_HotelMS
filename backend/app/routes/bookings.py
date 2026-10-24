from decimal import Decimal
from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response, ValidationError
from app.utils.validators import (
    require_json_body,
    validate_positive_int,
    validate_decimal_amount,
    validate_date_range,
    validate_enum,
    VALID_BOOKING_STATUSES,
    VALID_PAYMENT_METHODS,
)
from app.utils.auth import require_admin


def _fetch_booking_detail(cursor, b_id):
    """Fetch a single booking with joined User, Services, Location, Payment, Invoices, and Cancellation."""
    cursor.execute(
        """
        SELECT
            b.`B-ID` AS b_id,
            b.`U-ID` AS u_id,
            u.`Name` AS user_name,
            u.`Email` AS user_email,
            u.`Phone` AS user_phone,
            b.`S-ID` AS s_id,
            s.`Name` AS service_name,
            s.`Category` AS service_category,
            s.`Price` AS unit_price,
            s.`Max_Guests` AS max_guests,
            l.`L-ID` AS l_id,
            l.`Name` AS location_name,
            l.`City` AS city,
            l.`Country` AS country,
            b.`Check_In` AS check_in,
            b.`Check_Out` AS check_out,
            DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
            b.`Guests` AS guests,
            b.`Status` AS status,
            p.`P-ID` AS p_id,
            p.`Amt` AS paid_amt,
            p.`Date` AS payment_date,
            p.`Method` AS payment_method,
            i.`I-ID` AS i_id,
            i.`Amt` AS invoice_amt,
            i.`Date` AS invoice_date,
            c.`C-ID` AS c_id,
            c.`Date` AS cancellation_date,
            c.`Refund-amt` AS refund_amt
        FROM `Bookings` b
        INNER JOIN `User` u ON b.`U-ID` = u.`U-ID`
        INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        LEFT JOIN `Payment` p ON b.`B-ID` = p.`B-ID`
        LEFT JOIN `Invoices` i ON b.`B-ID` = i.`B-ID`
        LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
        WHERE b.`B-ID` = %s
        ORDER BY p.`P-ID` DESC
        LIMIT 1
        """,
        (b_id,),
    )
    row = cursor.fetchone()
    if row:
        nights = max(1, int(row["nights"] or 1))
        unit_price = Decimal(str(row["unit_price"]))
        row["calculated_total_amt"] = float(
            unit_price * nights if row["service_category"] == "Room" else unit_price
        )
    return row


@api_bp.route("/bookings", methods=["GET"])
def list_bookings():
    """Retrieve reservations with optional filters for u_id, s_id, l_id, or status."""
    u_id = request.args.get("u_id")
    s_id = request.args.get("s_id")
    l_id = request.args.get("l_id")
    status = request.args.get("status", "").strip()

    conditions = []
    params = []

    if u_id:
        conditions.append("b.`U-ID` = %s")
        params.append(validate_positive_int(u_id, "u_id"))
    if s_id:
        conditions.append("b.`S-ID` = %s")
        params.append(validate_positive_int(s_id, "s_id"))
    if l_id:
        conditions.append("s.`L-ID` = %s")
        params.append(validate_positive_int(l_id, "l_id"))
    if status:
        validate_enum(status, "status", VALID_BOOKING_STATUSES)
        conditions.append("b.`Status` = %s")
        params.append(status)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            b.`B-ID` AS b_id,
            b.`U-ID` AS u_id,
            u.`Name` AS user_name,
            u.`Email` AS user_email,
            u.`Phone` AS user_phone,
            b.`S-ID` AS s_id,
            s.`Name` AS service_name,
            s.`Category` AS service_category,
            s.`Price` AS unit_price,
            l.`L-ID` AS l_id,
            l.`Name` AS location_name,
            l.`City` AS city,
            b.`Check_In` AS check_in,
            b.`Check_Out` AS check_out,
            DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
            b.`Guests` AS guests,
            b.`Status` AS status,
            (SELECT p.`P-ID` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS p_id,
            (SELECT p.`Amt` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS paid_amt,
            (SELECT p.`Method` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS payment_method,
            i.`I-ID` AS i_id,
            i.`Amt` AS invoice_amt,
            c.`C-ID` AS c_id,
            c.`Refund-amt` AS refund_amt,
            c.`Date` AS cancellation_date
        FROM `Bookings` b
        INNER JOIN `User` u ON b.`U-ID` = u.`U-ID`
        INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        LEFT JOIN `Invoices` i ON b.`B-ID` = i.`B-ID`
        LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
        {where_clause}
        ORDER BY b.`B-ID` DESC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        bookings = cursor.fetchall()

    for row in bookings:
        nights = max(1, int(row["nights"] or 1))
        unit_price = Decimal(str(row["unit_price"]))
        row["calculated_total_amt"] = float(
            unit_price * nights if row["service_category"] == "Room" else unit_price
        )

    return success_response(data=bookings, meta={"count": len(bookings)})


@api_bp.route("/bookings/<int:b_id>", methods=["GET"])
def get_booking(b_id):
    """Retrieve complete details of a single reservation."""
    with db_cursor() as cursor:
        booking = _fetch_booking_detail(cursor, b_id)

    if not booking:
        return error_response(f"Booking #{b_id} not found.", status_code=404, code="NOT_FOUND")

    return success_response(data=booking)


@api_bp.route("/bookings", methods=["POST"])
def create_booking():
    """
    Create a new reservation inside an atomic database transaction.
    Enforces:
      1. check_out > check_in
      2. guests >= 1 and guests <= Services.Max_Guests
      3. Prevention of double-booking via row lock (FOR UPDATE) and date overlap check
         where Status IN ('Pending', 'Confirmed'). Cancelled bookings do not block availability.
      4. Optional simulated payment & invoice generation in the same transaction.
    """
    body = require_json_body(request.get_json(silent=True))
    u_id = validate_positive_int(body.get("u_id") or body.get("U-ID"), "u_id")
    s_id = validate_positive_int(body.get("s_id") or body.get("S-ID"), "s_id")
    check_in, check_out = validate_date_range(
        body.get("check_in") or body.get("Check_In"),
        body.get("check_out") or body.get("Check_Out"),
    )
    guests = validate_positive_int(body.get("guests") or body.get("Guests", 1), "guests", min_val=1)
    payment_method = body.get("payment_method") or body.get("Method")
    if payment_method:
        validate_enum(payment_method, "payment_method", VALID_PAYMENT_METHODS)

    nights = (check_out - check_in).days

    with db_transaction() as (_, cursor):
        # 1. Verify User exists
        cursor.execute("SELECT `U-ID`, `Name` FROM `User` WHERE `U-ID` = %s", (u_id,))
        user = cursor.fetchone()
        if not user:
            return error_response(f"User #{u_id} does not exist.", status_code=404, code="USER_NOT_FOUND")

        # 2. Lock Services row FOR UPDATE to serialize concurrent reservation attempts
        cursor.execute(
            """
            SELECT s.`S-ID`, s.`Name`, s.`Price`, s.`Category`, s.`Max_Guests`, s.`Total_Units`, l.`City`
            FROM `Services` s
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            WHERE s.`S-ID` = %s
            FOR UPDATE
            """,
            (s_id,),
        )
        service = cursor.fetchone()
        if not service:
            return error_response(f"Service #{s_id} does not exist.", status_code=404, code="SERVICE_NOT_FOUND")

        # 3. Validate guest capacity
        if guests > int(service["Max_Guests"]):
            raise ValidationError(
                f"Guest count ({guests}) exceeds maximum occupancy ({service['Max_Guests']}) for '{service['Name']}'."
            )

        # 4. Check overlapping active reservations (Pending or Confirmed only)
        cursor.execute(
            """
            SELECT COUNT(`B-ID`) AS active_overlaps
            FROM `Bookings`
            WHERE `S-ID` = %s
              AND `Status` IN ('Pending', 'Confirmed')
              AND `Check_In` < %s
              AND `Check_Out` > %s
            FOR UPDATE
            """,
            (s_id, check_out, check_in),
        )
        overlap_row = cursor.fetchone()
        active_overlaps = int(overlap_row["active_overlaps"]) if overlap_row else 0

        if active_overlaps >= int(service["Total_Units"]):
            return error_response(
                f"No available units for '{service['Name']}' between {check_in.isoformat()} and {check_out.isoformat()}.",
                status_code=409,
                code="OVERLAPPING_RESERVATION",
                details={
                    "s_id": s_id,
                    "total_units": service["Total_Units"],
                    "active_overlapping_bookings": active_overlaps,
                    "check_in": check_in.isoformat(),
                    "check_out": check_out.isoformat(),
                },
            )

        # 5. Determine initial status and total amount
        initial_status = "Confirmed" if payment_method else "Pending"
        unit_price = Decimal(str(service["Price"]))
        total_amt = (
            (unit_price * nights).quantize(Decimal("0.01"))
            if service["Category"] == "Room"
            else unit_price.quantize(Decimal("0.01"))
        )

        # 6. Insert Booking
        cursor.execute(
            """
            INSERT INTO `Bookings` (`U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (u_id, s_id, check_in, check_out, guests, initial_status),
        )
        new_b_id = cursor.lastrowid

        # 7. If simulated payment method was provided, record Payment + Invoice in the same transaction
        if payment_method:
            cursor.execute(
                """
                INSERT INTO `Payment` (`B-ID`, `Amt`, `Method`)
                VALUES (%s, %s, %s)
                """,
                (new_b_id, total_amt, payment_method),
            )
            cursor.execute(
                """
                INSERT INTO `Invoices` (`U-ID`, `B-ID`, `Amt`)
                VALUES (%s, %s, %s)
                """,
                (u_id, new_b_id, total_amt),
            )
            notif_msg = (
                f"Booking #{new_b_id} confirmed: {service['Name']} ({service['City']}) "
                f"from {check_in.isoformat()} to {check_out.isoformat()}."
            )
        else:
            notif_msg = (
                f"Payment pending for Booking #{new_b_id} ({service['Name']}, {service['City']}). "
                f"Complete payment to confirm."
            )

        cursor.execute(
            """
            INSERT INTO `Notification` (`U-ID`, `Message`)
            VALUES (%s, %s)
            """,
            (u_id, notif_msg),
        )

        created_booking = _fetch_booking_detail(cursor, new_b_id)

    return success_response(
        data=created_booking,
        message="Reservation created successfully.",
        status_code=201,
    )


@api_bp.route("/bookings/<int:b_id>/cancel", methods=["POST"])
def cancel_booking(b_id):
    """
    Cancel an eligible reservation ('Pending' or 'Confirmed') inside an atomic transaction:
      1. Updates Bookings.Status to 'Cancelled'
      2. Inserts a record into Cancellation (B-ID, Date, Refund-amt)
      3. Sends a Notification to the guest
    """
    body = request.get_json(silent=True) or {}
    requested_refund = body.get("refund_amt") if "refund_amt" in body else body.get("Refund-amt")

    with db_transaction() as (_, cursor):
        cursor.execute(
            """
            SELECT
                b.`B-ID` AS b_id,
                b.`U-ID` AS u_id,
                b.`S-ID` AS s_id,
                b.`Status` AS status,
                s.`Name` AS service_name,
                COALESCE((SELECT SUM(p.`Amt`) FROM `Payment` p WHERE p.`B-ID` = b.`B-ID`), 0.00) AS total_paid
            FROM `Bookings` b
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            WHERE b.`B-ID` = %s
            FOR UPDATE
            """,
            (b_id,),
        )
        booking = cursor.fetchone()
        if not booking:
            return error_response(f"Booking #{b_id} not found.", status_code=404, code="NOT_FOUND")

        if booking["status"] == "Cancelled":
            return error_response(
                f"Booking #{b_id} is already cancelled.",
                status_code=409,
                code="ALREADY_CANCELLED",
            )
        if booking["status"] == "Completed":
            return error_response(
                f"Booking #{b_id} is already completed and cannot be cancelled.",
                status_code=400,
                code="CANNOT_CANCEL_COMPLETED",
            )

        total_paid = Decimal(str(booking["total_paid"]))
        if requested_refund is not None:
            refund_amt = validate_decimal_amount(requested_refund, "refund_amt", allow_zero=True)
            if refund_amt > total_paid:
                raise ValidationError(
                    f"Refund amount ({refund_amt}) cannot exceed total amount paid ({total_paid})."
                )
        else:
            # Standard 90% academic refund policy on paid bookings, 0.00 on unpaid Pending bookings
            refund_amt = (
                (total_paid * Decimal("0.90")).quantize(Decimal("0.01"))
                if total_paid > Decimal("0.00")
                else Decimal("0.00")
            )

        cursor.execute(
            "UPDATE `Bookings` SET `Status` = 'Cancelled' WHERE `B-ID` = %s",
            (b_id,),
        )
        cursor.execute(
            """
            INSERT INTO `Cancellation` (`B-ID`, `Refund-amt`)
            VALUES (%s, %s)
            """,
            (b_id, refund_amt),
        )

        notif_msg = (
            f"Booking #{b_id} ({booking['service_name']}) has been cancelled. "
            f"A refund of INR {refund_amt:,.2f} has been recorded."
        )
        cursor.execute(
            """
            INSERT INTO `Notification` (`U-ID`, `Message`)
            VALUES (%s, %s)
            """,
            (booking["u_id"], notif_msg),
        )

        updated_booking = _fetch_booking_detail(cursor, b_id)

    return success_response(
        data=updated_booking,
        message="Reservation cancelled and refund recorded successfully.",
    )


@api_bp.route("/bookings/<int:b_id>/status", methods=["PATCH"])
@require_admin
def update_booking_status(b_id):
    """Administrative endpoint to update a reservation's status."""
    body = require_json_body(request.get_json(silent=True))
    new_status = validate_enum(
        body.get("status") or body.get("Status"), "status", VALID_BOOKING_STATUSES
    )

    if new_status == "Cancelled":
        return cancel_booking(b_id)

    with db_transaction() as (_, cursor):
        cursor.execute(
            """
            SELECT b.`B-ID`, b.`U-ID`, b.`S-ID`, b.`Check_In`, b.`Check_Out`, b.`Status`,
                   s.`Name` AS service_name, s.`Total_Units`
            FROM `Bookings` b
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            WHERE b.`B-ID` = %s
            FOR UPDATE
            """,
            (b_id,),
        )
        booking = cursor.fetchone()
        if not booking:
            return error_response(f"Booking #{b_id} not found.", status_code=404, code="NOT_FOUND")

        # If transitioning from Cancelled to Pending/Confirmed, verify inventory is still available
        if booking["Status"] == "Cancelled" and new_status in ("Pending", "Confirmed"):
            cursor.execute(
                """
                SELECT COUNT(`B-ID`) AS active_overlaps
                FROM `Bookings`
                WHERE `S-ID` = %s
                  AND `B-ID` != %s
                  AND `Status` IN ('Pending', 'Confirmed')
                  AND `Check_In` < %s
                  AND `Check_Out` > %s
                """,
                (booking["S-ID"], b_id, booking["Check_Out"], booking["Check_In"]),
            )
            overlaps = int(cursor.fetchone()["active_overlaps"])
            if overlaps >= int(booking["Total_Units"]):
                return error_response(
                    "Cannot reinstate cancelled booking because all units are now booked for those dates.",
                    status_code=409,
                    code="OVERLAPPING_RESERVATION",
                )
            cursor.execute("DELETE FROM `Cancellation` WHERE `B-ID` = %s", (b_id,))

        cursor.execute(
            "UPDATE `Bookings` SET `Status` = %s WHERE `B-ID` = %s",
            (new_status, b_id),
        )
        cursor.execute(
            """
            INSERT INTO `Notification` (`U-ID`, `Message`)
            VALUES (%s, %s)
            """,
            (
                booking["U-ID"],
                f"Status of your reservation #{b_id} ({booking['service_name']}) was updated to '{new_status}'.",
            ),
        )
        updated_booking = _fetch_booking_detail(cursor, b_id)

    return success_response(
        data=updated_booking,
        message=f"Booking status updated to '{new_status}'.",
    )
