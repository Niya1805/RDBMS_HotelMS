# REST API Documentation — Hotel Reservation System

**Base URL:** `http://localhost:5000/api`  
**Content-Type:** `application/json`  
**Backend Implementation:** [`backend/app/`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app)

---

## 1. Standard Response & Error Format

### Success Response
```json
{
  "status": "success",
  "message": "Optional human-readable confirmation",
  "data": { ... },
  "meta": { "count": 4 }
}
```

### Error Response
```json
{
  "status": "error",
  "error": {
    "code": "OVERLAPPING_RESERVATION",
    "message": "No available units for 'Oceanfront Pool Villa' between 2026-11-16 and 2026-11-19.",
    "details": { ... }
  }
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Invalid request body, `check_out <= check_in`, invalid guest count, or invalid enum value. |
| `400` | `CANNOT_CANCEL_COMPLETED` | Attempted to cancel a reservation that is already `'Completed'`. |
| `403` | `ADMIN_FORBIDDEN` | Missing or invalid `X-Admin-Passcode` header on an administrative endpoint. |
| `404` | `NOT_FOUND` | Requested entity ID (`L-ID`, `S-ID`, `U-ID`, `B-ID`, `P-ID`, `I-ID`, `R-ID`) does not exist. |
| `409` | `OVERLAPPING_RESERVATION` | All units of the requested room/service are already booked (`Pending` or `Confirmed`) for overlapping dates. |
| `409` | `ALREADY_CANCELLED` | Reservation has already been cancelled. |
| `409` | `DUPLICATE_USER` | A guest with the same `Email` or `Phone` already exists. |
| `503` | `DB_UNAVAILABLE` | MySQL 8 database server is unreachable or credentials in `backend/.env` require configuration. |

---

## 2. System Health Endpoint

### `GET /api/health`
Checks Flask server status, live MySQL 8 connection, and verifies which of the 9 ER tables exist.
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "service": "Hotel Reservation System REST API",
    "database": {
      "connected": true,
      "mysql_version": "8.0.x",
      "database": "hotel_reservation_db",
      "existing_tables": ["Bookings", "Cancellation", "Invoices", "Location", "Notification", "Payment", "Reviews", "Services", "User"],
      "expected_er_entities": ["User", "Location", "Services", "Bookings", "Payment", "Cancellation", "Invoices", "Reviews", "Notification"]
    }
  }
  ```

---

## 3. Locations Endpoints (`Location` Table)

### `GET /api/locations`
Retrieves all hotel locations along with room type count, add-on count, starting room price, and average review rating.
- **Query Parameters:** `city` *(optional string filter)*
- **Response (`200 OK`):** Array of location objects (`l_id`, `name`, `address`, `city`, `country`, `room_types_count`, `addon_services_count`, `total_room_units`, `starting_room_price`, `avg_rating`, `review_count`).

### `GET /api/locations/<int:l_id>`
Retrieves a single hotel location and all its associated `Services` (`Room` and `Add-On`).
- **Errors:** `404 NOT_FOUND`

### `POST /api/locations` *(Admin)*
Creates a new hotel branch in `Location`.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`
- **Request Body:**
  ```json
  {
    "name": "Grand Aurelia Heritage Jaipur",
    "address": "12 Amer Fort Road",
    "city": "Jaipur",
    "country": "India"
  }
  ```
- **Response (`201 Created`):** Created location record.

### `PUT /api/locations/<int:l_id>` *(Admin)*
Updates an existing hotel location.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`

---

## 4. Rooms, Services & Availability Endpoints (`Services` Table)

### `GET /api/services`
Retrieves bookable rooms and add-on services joined with `Location` and aggregated `Reviews`.
- **Query Parameters (all optional):**
  - `l_id` (`int`) — Filter by hotel location ID
  - `city` (`string`) — Filter by city name
  - `category` (`'Room'` or `'Add-On'`)
  - `guests` (`int`) — Minimum `Max_Guests` capacity
  - `max_price` (`decimal`) — Maximum price filter

### `GET /api/services/available`
Searches available rooms/services for a date range and guest count. Prevents double-booking by subtracting overlapping `'Pending'` and `'Confirmed'` bookings (`Check_In < req_check_out AND Check_Out > req_check_in`) from `Services.Total_Units`. Cancelled bookings are ignored.
- **Query Parameters:**
  - `check_in` *(required, `YYYY-MM-DD`)*
  - `check_out` *(required, `YYYY-MM-DD`, must be `> check_in`)*
  - `guests` *(optional `int`, default `1`)*
  - `l_id` *(optional `int`)*
  - `city` *(optional `string`)*
  - `category` *(optional `'Room'` | `'Add-On'` | `'all'`, default `'Room'`)*
  - `include_sold_out` *(optional `boolean`, default `false`)*
- **Response (`200 OK`):** Array of available services with `available_units`, `active_overlapping_bookings`, `nights`, and `estimated_total_price`.
- **Errors:** `400 VALIDATION_ERROR` if dates are missing or `check_out <= check_in`.

### `GET /api/services/<int:s_id>`
Retrieves full details of a specific room or service, including location details and all customer `Reviews`.

### `GET /api/services/<int:s_id>/availability`
Checks exact availability and price quote for a single service `s_id`.
- **Query Parameters:** `check_in` (`YYYY-MM-DD`), `check_out` (`YYYY-MM-DD`), `guests` (`int`, default `1`).

### `POST /api/services` *(Admin)*
Creates a new room or add-on service in `Services`.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`
- **Request Body:**
  ```json
  {
    "name": "Presidential Courtyard Suite",
    "price": 22000.00,
    "description": "Private courtyard, butler service, king bed.",
    "l_id": 1,
    "category": "Room",
    "max_guests": 4,
    "total_units": 2
  }
  ```

### `PUT /api/services/<int:s_id>` *(Admin)*
Updates room/service details, pricing, `max_guests`, or `total_units` inventory.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`

---

## 5. Guest Management Endpoints (`User` Table)

### `GET /api/users`
Lists registered guests (`U-ID`, `Name`, `Phone`, `Email`, `total_bookings`, `total_notifications`) or looks up a specific guest by `?email=` or `?phone=`.

### `GET /api/users/<int:u_id>`
Retrieves a guest's profile along with summary counts of their bookings, invoices, reviews, and notifications.

### `POST /api/users`
Registers a new guest in `User`.
- **Request Body:**
  ```json
  {
    "name": "Vikram Aditya",
    "phone": "+91-90000-10099",
    "email": "vikram.aditya@example.com",
    "lookup_or_create": false
  }
  ```
  *(If `lookup_or_create` is `true` and a user with that `email` or `phone` already exists, returns `200 OK` with the existing guest profile so checkout flows can seamlessly reuse returning guests.)*
- **Errors:** `400 VALIDATION_ERROR`, `409 DUPLICATE_USER`

### `PUT /api/users/<int:u_id>`
Updates a guest's `name`, `phone`, and `email`.

---

## 6. Reservations & Cancellations Endpoints (`Bookings` & `Cancellation` Tables)

### `GET /api/bookings`
Retrieves reservations joined with `User`, `Services`, `Location`, `Payment`, `Invoices`, and `Cancellation`.
- **Query Parameters (optional):** `u_id`, `s_id`, `l_id`, `status` (`Pending`, `Confirmed`, `Cancelled`, `Completed`).

### `GET /api/bookings/<int:b_id>`
Retrieves complete details of a single reservation by `B-ID`.

### `POST /api/bookings`
Creates a new reservation inside an **atomic database transaction** (`FOR UPDATE` row lock).
- **Request Body:**
  ```json
  {
    "u_id": 1,
    "s_id": 4,
    "check_in": "2026-11-20",
    "check_out": "2026-11-23",
    "guests": 2,
    "payment_method": "Credit Card"
  }
  ```
  *(Note: `payment_method` is optional. If provided, the simulated payment, invoice generation, booking confirmation (`Status = 'Confirmed'`), and confirmation notification are all committed atomically. If omitted, `Status` is set to `'Pending'`.)*
- **Errors:**
  - `400 VALIDATION_ERROR` (`check_out <= check_in` or `guests > Max_Guests`)
  - `404 USER_NOT_FOUND` / `SERVICE_NOT_FOUND`
  - `409 OVERLAPPING_RESERVATION` (no available units for those dates)

### `POST /api/bookings/<int:b_id>/cancel`
Cancels an eligible (`Pending` or `Confirmed`) reservation inside an **atomic transaction**:
1. Updates `Bookings.Status = 'Cancelled'`
2. Inserts a record into `Cancellation` (`B-ID`, `Date`, `Refund-amt`)
3. Inserts a cancellation alert into `Notification` (`U-ID`, `Message`)
- **Request Body (optional):**
  ```json
  {
    "refund_amt": 48600.00
  }
  ```
  *(If `refund_amt` is omitted, defaults to 90% of the paid amount for paid bookings, or `0.00` for unpaid bookings.)*
- **Errors:** `404 NOT_FOUND`, `409 ALREADY_CANCELLED`, `400 CANNOT_CANCEL_COMPLETED`

### `PATCH /api/bookings/<int:b_id>/status` *(Admin)*
Updates a reservation's `status` (`Pending`, `Confirmed`, `Completed`, `Cancelled`). Re-checks room availability if reinstating a cancelled booking.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`

### `GET /api/cancellations`
Retrieves all cancellation records from `Cancellation` joined with `Bookings`, `User`, `Services`, and `Location`.

---

## 7. Simulated Payments & Invoices Endpoints (`Payment` & `Invoices` Tables)

> **Academic Security Note:** This project uses a clearly labelled simulated payment flow. The backend explicitly rejects any payload containing raw card numbers (`card_number`), `cvv`, or `pin`.

### `GET /api/payments`
Retrieves payment records, resolving the paying `User` via `Bookings.U-ID` in 3NF.
- **Query Parameters (optional):** `b_id`, `u_id`

### `GET /api/payments/<int:p_id>`
Retrieves details of a single payment record by `P-ID`.

### `POST /api/payments`
Records a simulated payment for a booking, confirms the booking if `'Pending'`, generates/updates its `Invoices` record, and sends a `Notification`.
- **Request Body:**
  ```json
  {
    "b_id": 8,
    "method": "UPI"
  }
  ```
  *(Allowed `method` values: `'Credit Card'`, `'Debit Card'`, `'UPI'`, `'Net Banking'`, `'Cash'`.)*

### `GET /api/invoices`
Retrieves invoices joined with guest, booking, room/service, location, payment method, and refund details.
- **Query Parameters (optional):** `u_id`, `b_id`

### `GET /api/invoices/<int:i_id>`
Retrieves a single invoice by `I-ID`.

### `POST /api/invoices`
Generates an invoice for `b_id` (or returns the existing invoice if already created).
- **Request Body:** `{ "b_id": 8 }`

---

## 8. Reviews & Notifications Endpoints (`Reviews` & `Notification` Tables)

### `GET /api/reviews`
Retrieves guest reviews joined with `User`, `Services`, and `Location`.
- **Query Parameters (optional):** `s_id`, `l_id`, `u_id`

### `POST /api/reviews`
Submits a new review (`Rating` must be an integer between `1` and `5`).
- **Request Body:**
  ```json
  {
    "u_id": 1,
    "s_id": 1,
    "rating": 5,
    "comment": "Wonderful lakeside suite and impeccable hospitality."
  }
  ```

### `DELETE /api/reviews/<int:r_id>` *(Admin)*
Deletes a review by `R-ID`.
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`

### `GET /api/notifications`
Retrieves notifications joined with `User`.
- **Query Parameters (optional):** `u_id`

### `POST /api/notifications` *(Admin)*
Sends a notification message to a specific user (`u_id`, `message`).
- **Headers:** `X-Admin-Passcode: <ADMIN_PASSCODE>`

---

## 9. Analytical & Administrative Reports Endpoints

### `GET /api/reports/summary`
Returns system-wide KPIs: total users, locations, room units, booking counts by status, gross revenue (`SUM(Payment.Amt)`), total refunds (`SUM(Cancellation.\`Refund-amt\`)`), net revenue, and overall average review rating.

### `GET /api/reports/revenue`
Returns revenue breakdowns grouped by:
1. `by_location` (`Location`)
2. `by_category` (`Services.Category`: `'Room'` vs `'Add-On'`)
3. `by_payment_method` (`Payment.Method`)

### `GET /api/reports/occupancy`
Returns room/service availability, active bookings, cancelled bookings, and occupancy rate percentages across all locations for a specified `check_in` and `check_out` date window.
