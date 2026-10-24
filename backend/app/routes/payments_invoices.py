from decimal import Decimal
from flask import request
from app.routes import api_bp
from app.db import db_cursor, db_transaction
from app.utils.responses import success_response, error_response, ValidationError
from app.utils.validators import (
    require_json_body,
    validate_positive_int,
    validate_decimal_amount,
    validate_enum,
    VALID_PAYMENT_METHODS,
)


@api_bp.route("/payments", methods=["GET"])
def list_payments():
    """
    Retrieve payment records.
    Note: Resolves the paying User via Bookings.U-ID in 3NF (User — makes — Payment).
    """
    b_id = request.args.get("b_id")
    u_id = request.args.get("u_id")

    conditions = []
    params = []

    if b_id:
        conditions.append("p.`B-ID` = %s")
        params.append(validate_positive_int(b_id, "b_id"))
    if u_id:
        conditions.append("b.`U-ID` = %s")
        params.append(validate_positive_int(u_id, "u_id"))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            p.`P-ID` AS p_id,
            p.`B-ID` AS b_id,
            p.`Amt` AS amt,
            p.`Date` AS date,
            p.`Method` AS method,
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
            b.`Status` AS booking_status
        FROM `Payment` p
        INNER JOIN `Bookings` b ON p.`B-ID` = b.`B-ID`
        INNER JOIN `User` u ON b.`U-ID` = u.`U-ID`
        INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        {where_clause}
        ORDER BY p.`P-ID` DESC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        payments = cursor.fetchall()

    return success_response(
        data=payments,
        meta={"count": len(payments), "payment_mode": "SIMULATED_ACADEMIC_FLOW"},
    )


@api_bp.route("/payments/<int:p_id>", methods=["GET"])
def get_payment(p_id):
    """Retrieve details of a specific payment record."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                p.`P-ID` AS p_id,
                p.`B-ID` AS b_id,
                p.`Amt` AS amt,
                p.`Date` AS date,
                p.`Method` AS method,
                b.`U-ID` AS u_id,
                u.`Name` AS user_name,
                u.`Email` AS user_email,
                s.`Name` AS service_name,
                l.`Name` AS location_name,
                b.`Status` AS booking_status,
                i.`I-ID` AS i_id
            FROM `Payment` p
            INNER JOIN `Bookings` b ON p.`B-ID` = b.`B-ID`
            INNER JOIN `User` u ON b.`U-ID` = u.`U-ID`
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            LEFT JOIN `Invoices` i ON b.`B-ID` = i.`B-ID`
            WHERE p.`P-ID` = %s
            """,
            (p_id,),
        )
        payment = cursor.fetchone()

    if not payment:
        return error_response(f"Payment #{p_id} not found.", status_code=404, code="NOT_FOUND")

    return success_response(data=payment)


@api_bp.route("/payments", methods=["POST"])
def create_payment():
    """
    Record a simulated payment for a booking inside an atomic transaction.
    Security rule: Never accepts or stores real card numbers, CVVs, or PINs.
    Automatically confirms a 'Pending' booking, generates its Invoice, and notifies the User.
    """
    body = require_json_body(request.get_json(silent=True))

    if any(k in body for k in ("card_number", "cvv", "pin", "card_cvv")):
        raise ValidationError(
            "Do not submit real card numbers, CVVs, or PINs. This academic project uses a simulated payment flow."
        )

    b_id = validate_positive_int(body.get("b_id") or body.get("B-ID"), "b_id")
    method = validate_enum(
        body.get("method") or body.get("Method"), "method", VALID_PAYMENT_METHODS
    )
    raw_amt = body.get("amt") if "amt" in body else body.get("Amt")

    with db_transaction() as (_, cursor):
        cursor.execute(
            """
            SELECT
                b.`B-ID` AS b_id,
                b.`U-ID` AS u_id,
                b.`S-ID` AS s_id,
                b.`Check_In` AS check_in,
                b.`Check_Out` AS check_out,
                DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
                b.`Status` AS status,
                s.`Name` AS service_name,
                s.`Category` AS category,
                s.`Price` AS unit_price,
                l.`City` AS city
            FROM `Bookings` b
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
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
                f"Cannot record payment for cancelled Booking #{b_id}.",
                status_code=409,
                code="BOOKING_CANCELLED",
            )

        nights = max(1, int(booking["nights"] or 1))
        unit_price = Decimal(str(booking["unit_price"]))
        expected_amt = (
            (unit_price * nights).quantize(Decimal("0.01"))
            if booking["category"] == "Room"
            else unit_price.quantize(Decimal("0.01"))
        )
        amt = validate_decimal_amount(raw_amt, "amt") if raw_amt is not None else expected_amt

        # 1. Insert Payment record
        cursor.execute(
            """
            INSERT INTO `Payment` (`B-ID`, `Amt`, `Method`)
            VALUES (%s, %s, %s)
            """,
            (b_id, amt, method),
        )
        new_p_id = cursor.lastrowid

        # 2. Confirm booking if currently Pending
        if booking["status"] == "Pending":
            cursor.execute(
                "UPDATE `Bookings` SET `Status` = 'Confirmed' WHERE `B-ID` = %s",
                (b_id,),
            )

        # 3. Create or update the Invoice for this booking
        cursor.execute("SELECT `I-ID` FROM `Invoices` WHERE `B-ID` = %s", (b_id,))
        existing_invoice = cursor.fetchone()
        if existing_invoice:
            cursor.execute(
                "UPDATE `Invoices` SET `Amt` = %s WHERE `B-ID` = %s",
                (amt, b_id),
            )
            invoice_id = existing_invoice["I-ID"]
        else:
            cursor.execute(
                """
                INSERT INTO `Invoices` (`U-ID`, `B-ID`, `Amt`)
                VALUES (%s, %s, %s)
                """,
                (booking["u_id"], b_id, amt),
            )
            invoice_id = cursor.lastrowid

        # 4. Notify guest
        notif_msg = (
            f"Simulated payment of INR {amt:,.2f} via {method} received for Booking #{b_id} "
            f"({booking['service_name']}, {booking['city']}). Invoice #{invoice_id} generated."
        )
        cursor.execute(
            """
            INSERT INTO `Notification` (`U-ID`, `Message`)
            VALUES (%s, %s)
            """,
            (booking["u_id"], notif_msg),
        )

        cursor.execute(
            """
            SELECT
                p.`P-ID` AS p_id,
                p.`B-ID` AS b_id,
                p.`Amt` AS amt,
                p.`Date` AS date,
                p.`Method` AS method,
                b.`U-ID` AS u_id,
                b.`Status` AS booking_status,
                %s AS i_id
            FROM `Payment` p
            INNER JOIN `Bookings` b ON p.`B-ID` = b.`B-ID`
            WHERE p.`P-ID` = %s
            """,
            (invoice_id, new_p_id),
        )
        created_payment = cursor.fetchone()

    return success_response(
        data=created_payment,
        message="Simulated payment recorded and booking confirmed.",
        status_code=201,
    )


@api_bp.route("/invoices", methods=["GET"])
def list_invoices():
    """Retrieve invoices with full guest, booking, room/service, payment, and cancellation details."""
    u_id = request.args.get("u_id")
    b_id = request.args.get("b_id")

    conditions = []
    params = []

    if u_id:
        conditions.append("i.`U-ID` = %s")
        params.append(validate_positive_int(u_id, "u_id"))
    if b_id:
        conditions.append("i.`B-ID` = %s")
        params.append(validate_positive_int(b_id, "b_id"))

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT
            i.`I-ID` AS i_id,
            i.`U-ID` AS u_id,
            u.`Name` AS user_name,
            u.`Email` AS user_email,
            u.`Phone` AS user_phone,
            i.`B-ID` AS b_id,
            i.`Amt` AS amt,
            i.`Date` AS date,
            b.`Check_In` AS check_in,
            b.`Check_Out` AS check_out,
            DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
            b.`Guests` AS guests,
            b.`Status` AS booking_status,
            s.`S-ID` AS s_id,
            s.`Name` AS service_name,
            s.`Category` AS service_category,
            s.`Price` AS unit_price,
            l.`Name` AS location_name,
            l.`Address` AS location_address,
            l.`City` AS city,
            l.`Country` AS country,
            (SELECT p.`Method` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS payment_method,
            c.`Refund-amt` AS refund_amt
        FROM `Invoices` i
        INNER JOIN `User` u ON i.`U-ID` = u.`U-ID`
        INNER JOIN `Bookings` b ON i.`B-ID` = b.`B-ID`
        INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
        INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
        LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
        {where_clause}
        ORDER BY i.`I-ID` DESC
    """

    with db_cursor() as cursor:
        cursor.execute(query, tuple(params))
        invoices = cursor.fetchall()

    return success_response(data=invoices, meta={"count": len(invoices)})


@api_bp.route("/invoices/<int:i_id>", methods=["GET"])
def get_invoice(i_id):
    """Retrieve a single invoice by I-ID."""
    with db_cursor() as cursor:
        cursor.execute(
            """
            SELECT
                i.`I-ID` AS i_id,
                i.`U-ID` AS u_id,
                u.`Name` AS user_name,
                u.`Email` AS user_email,
                u.`Phone` AS user_phone,
                i.`B-ID` AS b_id,
                i.`Amt` AS amt,
                i.`Date` AS date,
                b.`Check_In` AS check_in,
                b.`Check_Out` AS check_out,
                DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
                b.`Guests` AS guests,
                b.`Status` AS booking_status,
                s.`S-ID` AS s_id,
                s.`Name` AS service_name,
                s.`Category` AS service_category,
                s.`Price` AS unit_price,
                l.`Name` AS location_name,
                l.`Address` AS location_address,
                l.`City` AS city,
                l.`Country` AS country,
                (SELECT p.`Method` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS payment_method,
                c.`Refund-amt` AS refund_amt
            FROM `Invoices` i
            INNER JOIN `User` u ON i.`U-ID` = u.`U-ID`
            INNER JOIN `Bookings` b ON i.`B-ID` = b.`B-ID`
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            LEFT JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
            WHERE i.`I-ID` = %s
            """,
            (i_id,),
        )
        invoice = cursor.fetchone()

    if not invoice:
        return error_response(f"Invoice #{i_id} not found.", status_code=404, code="NOT_FOUND")

    return success_response(data=invoice)


@api_bp.route("/invoices", methods=["POST"])
def generate_or_retrieve_invoice():
    """Generate an invoice for a booking (or return the existing invoice if already generated)."""
    body = require_json_body(request.get_json(silent=True))
    b_id = validate_positive_int(body.get("b_id") or body.get("B-ID"), "b_id")

    with db_transaction() as (_, cursor):
        cursor.execute("SELECT `I-ID` FROM `Invoices` WHERE `B-ID` = %s", (b_id,))
        existing = cursor.fetchone()
        if existing:
            i_id = existing["I-ID"]
            status_code = 200
            msg = "Existing invoice retrieved."
        else:
            cursor.execute(
                """
                SELECT
                    b.`B-ID` AS b_id,
                    b.`U-ID` AS u_id,
                    DATEDIFF(b.`Check_Out`, b.`Check_In`) AS nights,
                    s.`Price` AS unit_price,
                    s.`Category` AS category,
                    (SELECT p.`Amt` FROM `Payment` p WHERE p.`B-ID` = b.`B-ID` ORDER BY p.`P-ID` DESC LIMIT 1) AS paid_amt
                FROM `Bookings` b
                INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
                WHERE b.`B-ID` = %s
                """,
                (b_id,),
            )
            booking = cursor.fetchone()
            if not booking:
                return error_response(f"Booking #{b_id} not found.", status_code=404, code="NOT_FOUND")

            if booking["paid_amt"] is not None:
                amt = Decimal(str(booking["paid_amt"]))
            else:
                nights = max(1, int(booking["nights"] or 1))
                unit_price = Decimal(str(booking["unit_price"]))
                amt = (unit_price * nights) if booking["category"] == "Room" else unit_price

            cursor.execute(
                """
                INSERT INTO `Invoices` (`U-ID`, `B-ID`, `Amt`)
                VALUES (%s, %s, %s)
                """,
                (booking["u_id"], b_id, amt.quantize(Decimal("0.01"))),
            )
            i_id = cursor.lastrowid
            status_code = 201
            msg = "Invoice generated successfully."

        cursor.execute(
            """
            SELECT
                i.`I-ID` AS i_id,
                i.`U-ID` AS u_id,
                u.`Name` AS user_name,
                i.`B-ID` AS b_id,
                i.`Amt` AS amt,
                i.`Date` AS date,
                s.`Name` AS service_name,
                l.`Name` AS location_name
            FROM `Invoices` i
            INNER JOIN `User` u ON i.`U-ID` = u.`U-ID`
            INNER JOIN `Bookings` b ON i.`B-ID` = b.`B-ID`
            INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
            INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
            WHERE i.`I-ID` = %s
            """,
            (i_id,),
        )
        invoice = cursor.fetchone()

    return success_response(data=invoice, message=msg, status_code=status_code)
