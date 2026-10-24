import sys
import os
from decimal import Decimal
from datetime import date
import pytest
from mysql.connector import Error as MySQLError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.db as db_module


class ControlledSQLCursor:
    """
    Controlled relational test harness that executes the backend's exact parameterized SQL
    queries against an isolated in-memory relational state when a live MySQL test server
    is not yet configured with local credentials, and verifies SQL parameterization.
    """

    def __init__(self, state):
        self.state = state
        self._results = []
        self.lastrowid = None

    def execute(self, query, params=()):
        # Ensure parameterized queries are always used (never raw string formatting of values)
        assert isinstance(params, (tuple, list)), "SQL parameters must be a tuple or list"
        q = " ".join(query.split())
        self._results = []

        # 1. User queries
        if "FROM `User` WHERE `U-ID` = %s" in q and q.startswith("SELECT"):
            u_id = int(params[0])
            u = self.state["users"].get(u_id)
            if u:
                self._results = [{"U-ID": u["u_id"], "u_id": u["u_id"], "Name": u["name"], "name": u["name"], "Phone": u["phone"], "phone": u["phone"], "Email": u["email"], "email": u["email"]}]
            return

        if "FROM `User` WHERE LOWER(`Email`) = LOWER(%s) OR `Phone` = %s" in q:
            email, phone = params[0].lower(), params[1]
            for u in self.state["users"].values():
                if u["email"].lower() == email or u["phone"] == phone:
                    self._results = [dict(u)]
                    return
            return

        if q.startswith("INSERT INTO `User`"):
            name, phone, email = params
            new_id = max(self.state["users"].keys(), default=0) + 1
            self.state["users"][new_id] = {"u_id": new_id, "name": name, "phone": phone, "email": email}
            self.lastrowid = new_id
            return

        # 2. Services & Availability queries
        if "FROM `Services` s INNER JOIN `Location` l" in q and "FOR UPDATE" in q:
            s_id = int(params[0])
            s = self.state["services"].get(s_id)
            if s:
                self._results = [{
                    "S-ID": s["s_id"],
                    "Name": s["name"],
                    "Price": Decimal(str(s["price"])),
                    "Category": s["category"],
                    "Max_Guests": s["max_guests"],
                    "Total_Units": s["total_units"],
                    "City": s["city"],
                }]
            return

        if "FROM `Services` s" in q and "LEFT JOIN `Bookings` b" in q and "WHERE s.`S-ID` = %s" in q:
            req_out, req_in, s_id = params[0], params[1], int(params[2])
            s = self.state["services"].get(s_id)
            if not s:
                return
            overlaps = sum(
                1 for b in self.state["bookings"].values()
                if b["s_id"] == s_id
                and b["status"] in ("Pending", "Confirmed")
                and b["check_in"] < req_out
                and b["check_out"] > req_in
            )
            self._results = [{
                "s_id": s["s_id"],
                "name": s["name"],
                "price": Decimal(str(s["price"])),
                "category": s["category"],
                "max_guests": s["max_guests"],
                "total_units": s["total_units"],
                "active_overlapping_bookings": overlaps,
            }]
            return

        if "FROM `Services` s INNER JOIN `Location` l" in q and "LEFT JOIN `Bookings` b" in q:
            req_out, req_in, min_guests = params[0], params[1], int(params[2])
            rows = []
            for s in self.state["services"].values():
                if s["max_guests"] < min_guests:
                    continue
                if "s.`Category` = %s" in q and s["category"] != params[-1]:
                    continue
                overlaps = sum(
                    1 for b in self.state["bookings"].values()
                    if b["s_id"] == s["s_id"]
                    and b["status"] in ("Pending", "Confirmed")
                    and b["check_in"] < req_out
                    and b["check_out"] > req_in
                )
                avail = s["total_units"] - overlaps
                if "HAVING available_units > 0" in q and avail <= 0:
                    continue
                rows.append({
                    "s_id": s["s_id"],
                    "name": s["name"],
                    "price": Decimal(str(s["price"])),
                    "description": s["description"],
                    "l_id": s["l_id"],
                    "category": s["category"],
                    "max_guests": s["max_guests"],
                    "total_units": s["total_units"],
                    "location_name": s["location_name"],
                    "location_address": "14 Heritage Promenade",
                    "city": s["city"],
                    "country": "India",
                    "active_overlapping_bookings": overlaps,
                    "available_units": avail,
                    "avg_rating": 5.0,
                    "review_count": 1,
                })
            self._results = rows
            return

        # 3. Overlap count in Bookings FOR UPDATE
        if "SELECT COUNT(`B-ID`) AS active_overlaps FROM `Bookings`" in q:
            s_id, req_out, req_in = int(params[0]), params[1], params[2]
            overlaps = sum(
                1 for b in self.state["bookings"].values()
                if b["s_id"] == s_id
                and b["status"] in ("Pending", "Confirmed")
                and b["check_in"] < req_out
                and b["check_out"] > req_in
            )
            self._results = [{"active_overlaps": overlaps}]
            return

        # 4. Insert Booking
        if q.startswith("INSERT INTO `Bookings`"):
            u_id, s_id, check_in, check_out, guests, status = params
            new_b_id = max(self.state["bookings"].keys(), default=0) + 1
            self.state["bookings"][new_b_id] = {
                "b_id": new_b_id,
                "u_id": int(u_id),
                "s_id": int(s_id),
                "check_in": check_in,
                "check_out": check_out,
                "guests": int(guests),
                "status": status,
            }
            self.lastrowid = new_b_id
            return

        # 5. Insert Payment
        if q.startswith("INSERT INTO `Payment`"):
            b_id, amt, method = int(params[0]), Decimal(str(params[1])), params[2]
            new_p_id = max(self.state["payments"].keys(), default=0) + 1
            self.state["payments"][new_p_id] = {
                "p_id": new_p_id,
                "b_id": b_id,
                "amt": amt,
                "method": method,
                "date": "2026-10-24 12:00:00",
            }
            self.lastrowid = new_p_id
            return

        # 6. Insert Invoice
        if q.startswith("INSERT INTO `Invoices`"):
            u_id, b_id, amt = int(params[0]), int(params[1]), Decimal(str(params[2]))
            new_i_id = max(self.state["invoices"].keys(), default=0) + 1
            self.state["invoices"][new_i_id] = {
                "i_id": new_i_id,
                "u_id": u_id,
                "b_id": b_id,
                "amt": amt,
                "date": "2026-10-24 12:00:00",
            }
            self.lastrowid = new_i_id
            return

        # 7. Insert Notification
        if q.startswith("INSERT INTO `Notification`"):
            u_id, msg = int(params[0]), params[1]
            new_n_id = len(self.state["notifications"]) + 1
            self.state["notifications"].append({"n_id": new_n_id, "u_id": u_id, "message": msg})
            self.lastrowid = new_n_id
            return

        # 8. Booking lookup for cancellation
        if "FROM `Bookings` b INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID` WHERE b.`B-ID` = %s FOR UPDATE" in q:
            b_id = int(params[0])
            b = self.state["bookings"].get(b_id)
            if not b:
                return
            s = self.state["services"][b["s_id"]]
            total_paid = sum(
                p["amt"] for p in self.state["payments"].values() if p["b_id"] == b_id
            )
            self._results = [{
                "b_id": b["b_id"],
                "u_id": b["u_id"],
                "s_id": b["s_id"],
                "status": b["status"],
                "service_name": s["name"],
                "total_paid": Decimal(str(total_paid)),
            }]
            return

        # 9. Update Booking status
        if q.startswith("UPDATE `Bookings` SET `Status` = 'Cancelled'"):
            b_id = int(params[0])
            self.state["bookings"][b_id]["status"] = "Cancelled"
            return

        # 10. Insert Cancellation
        if q.startswith("INSERT INTO `Cancellation`"):
            b_id, refund_amt = int(params[0]), Decimal(str(params[1]))
            new_c_id = len(self.state["cancellations"]) + 1
            self.state["cancellations"][b_id] = {
                "c_id": new_c_id,
                "b_id": b_id,
                "refund_amt": refund_amt,
                "date": "2026-10-24 12:05:00",
            }
            self.lastrowid = new_c_id
            return

        # 11. Fetch full booking detail (_fetch_booking_detail)
        if "FROM `Bookings` b INNER JOIN `User` u" in q and "WHERE b.`B-ID` = %s" in q:
            b_id = int(params[0])
            b = self.state["bookings"].get(b_id)
            if not b:
                return
            u = self.state["users"][b["u_id"]]
            s = self.state["services"][b["s_id"]]
            pay = next((p for p in self.state["payments"].values() if p["b_id"] == b_id), None)
            inv = next((i for i in self.state["invoices"].values() if i["b_id"] == b_id), None)
            canc = self.state["cancellations"].get(b_id)
            nights = (b["check_out"] - b["check_in"]).days
            self._results = [{
                "b_id": b["b_id"],
                "u_id": u["u_id"],
                "user_name": u["name"],
                "user_email": u["email"],
                "user_phone": u["phone"],
                "s_id": s["s_id"],
                "service_name": s["name"],
                "service_category": s["category"],
                "unit_price": Decimal(str(s["price"])),
                "max_guests": s["max_guests"],
                "l_id": s["l_id"],
                "location_name": s["location_name"],
                "city": s["city"],
                "country": "India",
                "check_in": b["check_in"],
                "check_out": b["check_out"],
                "nights": nights,
                "guests": b["guests"],
                "status": b["status"],
                "p_id": pay["p_id"] if pay else None,
                "paid_amt": pay["amt"] if pay else None,
                "payment_date": pay["date"] if pay else None,
                "payment_method": pay["method"] if pay else None,
                "i_id": inv["i_id"] if inv else None,
                "invoice_amt": inv["amt"] if inv else None,
                "invoice_date": inv["date"] if inv else None,
                "c_id": canc["c_id"] if canc else None,
                "cancellation_date": canc["date"] if canc else None,
                "refund_amt": canc["refund_amt"] if canc else None,
            }]
            return

    def fetchone(self):
        return self._results[0] if self._results else None

    def fetchall(self):
        return list(self._results)

    def close(self):
        pass


class ControlledConnection:
    def __init__(self, state):
        self.state = state

    def cursor(self, dictionary=True):
        return ControlledSQLCursor(self.state)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


@pytest.fixture
def controlled_db_state(monkeypatch):
    """Provide a fresh, isolated relational state with 1 single-unit Villa and 1 multi-unit Suite."""
    state = {
        "users": {
            1: {"u_id": 1, "name": "Aarav Mehta", "phone": "+91-90000-10001", "email": "aarav.mehta@example.com"},
            2: {"u_id": 2, "name": "Diya Sharma", "phone": "+91-90000-10002", "email": "diya.sharma@example.com"},
        },
        "services": {
            4: {
                "s_id": 4,
                "name": "Oceanfront Pool Villa",
                "price": Decimal("18000.00"),
                "description": "Direct beach access, private infinity plunge pool.",
                "l_id": 2,
                "location_name": "Grand Aurelia Bay Resort Goa",
                "city": "Margao",
                "category": "Room",
                "max_guests": 4,
                "total_units": 1,  # Single-unit villa for testing overlap conflicts!
            },
            1: {
                "s_id": 1,
                "name": "Royal Lakeview Suite",
                "price": Decimal("14500.00"),
                "description": "Panoramic Lake Pichola views.",
                "l_id": 1,
                "location_name": "Grand Aurelia Palace Udaipur",
                "city": "Udaipur",
                "category": "Room",
                "max_guests": 3,
                "total_units": 2,
            },
        },
        "bookings": {
            # Cancelled booking on S-ID=4 from 2026-11-15 to 2026-11-18
            4: {
                "b_id": 4,
                "u_id": 1,
                "s_id": 4,
                "check_in": date(2026, 11, 15),
                "check_out": date(2026, 11, 18),
                "guests": 2,
                "status": "Cancelled",
            },
            # Completed booking on S-ID=1
            1: {
                "b_id": 1,
                "u_id": 1,
                "s_id": 1,
                "check_in": date(2026, 10, 5),
                "check_out": date(2026, 10, 8),
                "guests": 2,
                "status": "Completed",
            },
        },
        "payments": {},
        "invoices": {},
        "cancellations": {
            4: {"c_id": 1, "b_id": 4, "refund_amt": Decimal("48600.00"), "date": "2026-10-21 12:00:00"}
        },
        "notifications": [],
    }

    monkeypatch.setattr(db_module, "get_db_connection", lambda database=None: ControlledConnection(state))
    return state


@pytest.fixture
def client(controlled_db_state):
    app = create_app({"TESTING": True, "ADMIN_PASSCODE": "test-admin-secret"})
    with app.test_client() as test_client:
        yield test_client


def test_availability_ignores_cancelled_bookings(client):
    """
    Verify that Booking #4 (Status='Cancelled' for 2026-11-15 to 2026-11-18 on S-ID=4, Total_Units=1)
    does NOT block availability for those exact dates.
    """
    res = client.get("/api/services/4/availability?check_in=2026-11-15&check_out=2026-11-18&guests=2")
    assert res.status_code == 200
    payload = res.get_json()["data"]
    assert payload["is_available"] is True
    assert payload["available_units"] == 1
    assert payload["active_overlapping_bookings"] == 0
    assert payload["estimated_total_price"] == 54000.0


def test_reservation_creation_and_overlap_prevention(client):
    """
    1. Create a confirmed reservation on S-ID=4 (Total_Units=1) for 2026-11-15 to 2026-11-18 -> 201 Created.
    2. Attempt a second overlapping reservation (2026-11-16 to 2026-11-19) -> 409 OVERLAPPING_RESERVATION.
    3. Cancel the first reservation -> 200 OK (Status becomes 'Cancelled', refund recorded).
    4. Retry the second reservation for 2026-11-16 to 2026-11-19 -> 201 Created!
    """
    # Step 1: First guest books the single-unit Oceanfront Pool Villa
    res1 = client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 4,
            "check_in": "2026-11-15",
            "check_out": "2026-11-18",
            "guests": 2,
            "payment_method": "Credit Card",
        },
    )
    assert res1.status_code == 201
    booking1 = res1.get_json()["data"]
    assert booking1["status"] == "Confirmed"
    assert booking1["paid_amt"] == 54000.0
    assert booking1["i_id"] is not None

    # Step 2: Second guest attempts overlapping dates (2026-11-16 to 2026-11-19) -> Rejected with 409!
    res2 = client.post(
        "/api/bookings",
        json={
            "u_id": 2,
            "s_id": 4,
            "check_in": "2026-11-16",
            "check_out": "2026-11-19",
            "guests": 2,
        },
    )
    assert res2.status_code == 409
    err_payload = res2.get_json()["error"]
    assert err_payload["code"] == "OVERLAPPING_RESERVATION"

    # Step 3: Cancel booking1 -> Status='Cancelled', 90% refund (48,600.00) recorded in Cancellation
    res_cancel = client.post(f"/api/bookings/{booking1['b_id']}/cancel", json={})
    assert res_cancel.status_code == 200
    cancelled_data = res_cancel.get_json()["data"]
    assert cancelled_data["status"] == "Cancelled"
    assert cancelled_data["refund_amt"] == 48600.0

    # Step 4: Now that booking1 is cancelled, the second guest CAN book 2026-11-16 to 2026-11-19!
    res3 = client.post(
        "/api/bookings",
        json={
            "u_id": 2,
            "s_id": 4,
            "check_in": "2026-11-16",
            "check_out": "2026-11-19",
            "guests": 3,
            "payment_method": "UPI",
        },
    )
    assert res3.status_code == 201
    assert res3.get_json()["data"]["status"] == "Confirmed"


def test_cancellation_edge_cases(client):
    """Verify already-cancelled and already-completed bookings cannot be cancelled."""
    # Booking #4 is already Cancelled
    res_dup = client.post("/api/bookings/4/cancel", json={})
    assert res_dup.status_code == 409
    assert res_dup.get_json()["error"]["code"] == "ALREADY_CANCELLED"

    # Booking #1 is already Completed
    res_comp = client.post("/api/bookings/1/cancel", json={})
    assert res_comp.status_code == 400
    assert res_comp.get_json()["error"]["code"] == "CANNOT_CANCEL_COMPLETED"


def test_validation_errors(client):
    """Verify backend validation for check-out <= check-in, guest capacity, card data rejection, and admin auth."""
    # 1. check_out <= check_in
    res_dates = client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 1,
            "check_in": "2026-12-10",
            "check_out": "2026-12-10",
            "guests": 2,
        },
    )
    assert res_dates.status_code == 400
    assert "strictly later than check-in" in res_dates.get_json()["error"]["message"]

    # 2. Guests exceeding Max_Guests (S-ID=1 has Max_Guests=3)
    res_guests = client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 1,
            "check_in": "2026-12-10",
            "check_out": "2026-12-12",
            "guests": 6,
        },
    )
    assert res_guests.status_code == 400
    assert "exceeds maximum occupancy" in res_guests.get_json()["error"]["message"]

    # 3. Payment endpoint rejects raw credit card numbers/CVVs
    res_card = client.post(
        "/api/payments",
        json={
            "b_id": 1,
            "method": "Credit Card",
            "card_number": "4111222233334444",
            "cvv": "123",
        },
    )
    assert res_card.status_code == 400
    assert "simulated payment flow" in res_card.get_json()["error"]["message"]

    # 4. Admin endpoint rejects missing/invalid X-Admin-Passcode header
    res_admin = client.post(
        "/api/locations",
        json={"name": "Test Hotel", "address": "123 Street", "city": "Jaipur", "country": "India"},
    )
    assert res_admin.status_code == 403
    assert res_admin.get_json()["error"]["code"] == "ADMIN_FORBIDDEN"


def test_database_failure_sanitization(monkeypatch):
    """
    Verify that when MySQL throws an authentication/connection failure or constraint error,
    the backend returns a clean JSON error and NEVER exposes database passwords or stack traces.
    """
    def broken_connect(*args, **kwargs):
        raise MySQLError(msg="Access denied for user 'root'@'localhost' (using password: super_secret_db_pass_999)", errno=1045)

    monkeypatch.setattr(db_module.mysql.connector, "connect", broken_connect)
    app = create_app({"TESTING": True})

    with app.test_client() as test_client:
        res = test_client.get("/api/locations")
        assert res.status_code == 503
        body_text = res.get_data(as_text=True)
        assert "super_secret_db_pass_999" not in body_text
        payload = res.get_json()
        assert payload["status"] == "error"
        assert payload["error"]["code"] == "DB_UNAVAILABLE"
