import sys
import os
from decimal import Decimal
from datetime import date
import pytest
from mysql.connector import Error as MySQLError

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
import app.db as db_module
from tests.test_api import ControlledSQLCursor


class TransactionalTestConnection:
    """
    Wraps ControlledSQLCursor with snapshot-based transaction support so that
    COMMIT persists changes and ROLLBACK restores the exact pre-transaction state.
    """

    def __init__(self, state):
        self.state = state
        self._snapshot = self._clone_state(state)
        self.rolled_back = False
        self.committed = False

    @staticmethod
    def _clone_state(st):
        import copy
        return copy.deepcopy(st)

    def cursor(self, dictionary=True):
        return ExtendedSQLCursor(self.state)

    def commit(self):
        self.committed = True
        self._snapshot = self._clone_state(self.state)

    def rollback(self):
        self.rolled_back = True
        self.state.clear()
        self.state.update(self._clone_state(self._snapshot))

    def close(self):
        pass


class ExtendedSQLCursor(ControlledSQLCursor):
    """Extends ControlledSQLCursor with Location, Reviews, Notification, Invoices, and Rollback hooks."""

    def execute(self, query, params=()):
        q = " ".join(query.split())
        if self.state.get("fail_on_notification") and q.startswith("INSERT INTO `Notification`"):
            raise MySQLError(msg="Simulated mid-transaction failure on Notification insert", errno=1213)

        if "FROM `Location` l" in q and q.startswith("SELECT"):
            self._results = [
                {
                    "l_id": 1,
                    "name": "Grand Aurelia Palace Udaipur",
                    "address": "14 Lake Pichola Promenade",
                    "city": "Udaipur",
                    "country": "India",
                    "room_types_count": 1,
                    "addon_services_count": 0,
                    "total_room_units": 2,
                    "starting_room_price": Decimal("14500.00"),
                    "avg_rating": 5.0,
                    "review_count": 1,
                }
            ]
            return

        if q.startswith("SELECT `L-ID` FROM `Location` WHERE `L-ID` = %s"):
            l_id = int(params[0])
            if l_id in (1, 2):
                self._results = [{"L-ID": l_id}]
            else:
                self._results = []
            return

        if q.startswith("SELECT `S-ID`, `Name` FROM `Services` WHERE `S-ID` = %s"):
            s_id = int(params[0])
            s = self.state["services"].get(s_id)
            self._results = [{"S-ID": s["s_id"], "Name": s["name"]}] if s else []
            return

        if q.startswith("INSERT INTO `Reviews`"):
            u_id, s_id, rating, comment = int(params[0]), int(params[1]), int(params[2]), params[3]
            new_r_id = len(self.state.setdefault("reviews", {})) + 1
            self.state["reviews"][new_r_id] = {
                "r_id": new_r_id,
                "u_id": u_id,
                "s_id": s_id,
                "rating": rating,
                "comment": comment,
            }
            self.lastrowid = new_r_id
            return

        if "FROM `Reviews` r" in q and "WHERE r.`R-ID` = %s" in q:
            r_id = int(params[0])
            r = self.state.get("reviews", {}).get(r_id)
            if r:
                u = self.state["users"][r["u_id"]]
                s = self.state["services"][r["s_id"]]
                self._results = [{
                    "r_id": r["r_id"],
                    "u_id": r["u_id"],
                    "user_name": u["name"],
                    "s_id": r["s_id"],
                    "service_name": s["name"],
                    "rating": r["rating"],
                    "comment": r["comment"],
                }]
            return

        if "FROM `Notification` n INNER JOIN `User` u" in q:
            rows = []
            for n in reversed(self.state["notifications"]):
                if params and int(params[0]) != n["u_id"]:
                    continue
                u = self.state["users"][n["u_id"]]
                rows.append({
                    "n_id": n["n_id"],
                    "u_id": n["u_id"],
                    "user_name": u["name"],
                    "user_email": u["email"],
                    "message": n["message"],
                })
            self._results = rows
            return

        super().execute(query, params)


@pytest.fixture
def tx_state(monkeypatch):
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
                "total_units": 1,
            },
        },
        "bookings": {},
        "payments": {},
        "invoices": {},
        "cancellations": {},
        "notifications": [],
        "reviews": {},
        "fail_on_notification": False,
    }
    monkeypatch.setattr(
        db_module, "get_db_connection", lambda database=None: TransactionalTestConnection(state)
    )
    return state


@pytest.fixture
def e2e_client(tx_state):
    app = create_app({"TESTING": True, "ADMIN_PASSCODE": "admin123"})
    with app.test_client() as client:
        yield client


def test_non_overlapping_adjacent_dates_succeed(e2e_client):
    """
    Verify that non-overlapping adjacent date ranges (e.g., Guest 1 books Nov 10 to Nov 13,
    and Guest 2 books Nov 13 to Nov 16 on a single-unit room) both succeed without conflict.
    """
    r1 = e2e_client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 4,
            "check_in": "2026-11-10",
            "check_out": "2026-11-13",
            "guests": 2,
            "payment_method": "Credit Card",
        },
    )
    assert r1.status_code == 201

    # Adjacent check-in on the exact check-out day of Booking 1 (Nov 13 -> Nov 16)
    r2 = e2e_client.post(
        "/api/bookings",
        json={
            "u_id": 2,
            "s_id": 4,
            "check_in": "2026-11-13",
            "check_out": "2026-11-16",
            "guests": 2,
            "payment_method": "UPI",
        },
    )
    assert r2.status_code == 201
    b2 = r2.get_json()["data"]
    assert b2["nights"] == 3
    assert b2["calculated_total_amt"] == 54000.0
    assert b2["paid_amt"] == 54000.0


def test_persistence_across_requests_and_reviews_notifications(e2e_client):
    """
    Verify that creating a booking persists across subsequent GET requests (simulating page refresh),
    generates a Notification, and allows submitting a Review.
    """
    create_res = e2e_client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 4,
            "check_in": "2026-12-01",
            "check_out": "2026-12-03",
            "guests": 2,
            "payment_method": "Debit Card",
        },
    )
    assert create_res.status_code == 201
    b_id = create_res.get_json()["data"]["b_id"]

    # Retrieve after simulated page refresh
    get_res = e2e_client.get(f"/api/bookings/{b_id}")
    assert get_res.status_code == 200
    fetched = get_res.get_json()["data"]
    assert fetched["b_id"] == b_id
    assert fetched["status"] == "Confirmed"
    assert fetched["paid_amt"] == 36000.0  # 2 nights * 18,000.00

    # Verify notification was created for u_id=1
    notif_res = e2e_client.get("/api/notifications?u_id=1")
    assert notif_res.status_code == 200
    notifs = notif_res.get_json()["data"]
    assert len(notifs) >= 1
    assert f"Booking #{b_id} confirmed" in notifs[0]["message"]

    # Submit a review
    rev_res = e2e_client.post(
        "/api/reviews",
        json={"u_id": 1, "s_id": 4, "rating": 5, "comment": "Fantastic villa stay!"},
    )
    assert rev_res.status_code == 201
    assert rev_res.get_json()["data"]["rating"] == 5


def test_invalid_ids_and_missing_fields_return_clear_errors(e2e_client):
    """Verify 404 on non-existent IDs and 400 on missing required fields."""
    # Non-existent booking ID
    res_404 = e2e_client.get("/api/bookings/99999")
    assert res_404.status_code == 404
    assert res_404.get_json()["error"]["code"] == "NOT_FOUND"

    # Non-existent user ID when creating booking
    res_bad_user = e2e_client.post(
        "/api/bookings",
        json={"u_id": 999, "s_id": 4, "check_in": "2026-12-10", "check_out": "2026-12-12", "guests": 1},
    )
    assert res_bad_user.status_code == 404
    assert res_bad_user.get_json()["error"]["code"] == "USER_NOT_FOUND"

    # Missing check_in / check_out on availability search
    res_missing = e2e_client.get("/api/services/available")
    assert res_missing.status_code == 400
    assert res_missing.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_atomic_transaction_rollback_on_mid_operation_failure(e2e_client, tx_state):
    """
    Verify that if a multi-step reservation transaction fails mid-way (e.g. during
    the final Notification insert after Bookings, Payment, and Invoices were inserted),
    the entire SQL transaction rolls back and leaves zero orphaned records in Bookings,
    Payment, or Invoices.
    """
    tx_state["fail_on_notification"] = True

    res = e2e_client.post(
        "/api/bookings",
        json={
            "u_id": 1,
            "s_id": 4,
            "check_in": "2026-12-20",
            "check_out": "2026-12-22",
            "guests": 2,
            "payment_method": "Credit Card",
        },
    )
    assert res.status_code == 500
    assert len(tx_state["bookings"]) == 0
    assert len(tx_state["payments"]) == 0
    assert len(tx_state["invoices"]) == 0
