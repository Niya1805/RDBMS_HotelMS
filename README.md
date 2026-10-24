# Grand Aurelia — Hotel Reservation System (RDBMS Project)

A complete full-stack **Hotel Reservation System** built for an RDBMS Lab & Theory evaluation. The system is designed directly around the original Chen-style Entity-Relationship diagram in [`Diagram1.dia`](./Diagram1.dia), backed by **MySQL 8.0**, a **Python Flask REST API**, and a responsive **React + Vite + Tailwind CSS** hospitality web application.

---

## 1. Project Overview & Key Features

- **100% Fidelity to Original ER Diagram (`Diagram1.dia`)**:
  - Preserves all **9 original entities** (`User`, `Location`, `Services`, `Bookings`, `Payment`, `Cancellation`, `Invoices`, `Reviews`, `Notification`) and all **35 original attribute names** verbatim (including hyphenated identifiers such as `` `U-ID` ``, `` `B-ID` ``, `` `S-ID` ``, `` `L-ID` ``, and `` `Refund-amt` ``).
  - Clearly separates original diagram attributes from approved relational additions required for room inventory and conflict-free date-range reservations (documented in [`docs/erd_analysis.md`](./docs/erd_analysis.md) and [`docs/database_design.md`](./docs/database_design.md)).
- **Real-Time Room & Service Availability Search**:
  - Supports both bookable hotel rooms/suites (`Category = 'Room'`) and bespoke hotel experiences (`Category = 'Add-On'`).
  - Prevents double-booking using interval intersection logic (`Check_In < req_check_out AND Check_Out > req_check_in`) and row-level locking (`SELECT ... FOR UPDATE`).
  - Ensures `'Cancelled'` reservations never block availability for future guests.
- **Atomic Reservation, Simulated Payment, Invoicing & Cancellation Workflows**:
  - Multi-table SQL transactions (`START TRANSACTION` / `COMMIT` / `ROLLBACK`) guarantee atomicity across `Bookings`, `Payment`, `Invoices`, `Cancellation`, and `Notification`.
  - Clearly labelled **Simulated Academic Payment Flow** (explicitly rejects raw credit card numbers or CVVs).
- **Customer & Reception/Admin Portals**:
  - **Public Website**: Hero search, Destination showcase, Filterable Search Results, Room/Service Detail & Availability Calculator, Checkout, Booking Confirmation, Booking Lookup & Cancellation, Reviews, and ER Architecture Inspector.
  - **Guest Dashboard**: Manage bookings, settle pending payments, view printable tax invoices, read notifications, submit reviews, and update guest contact details.
  - **Admin & Reception Console**: Protected by the `X-Admin-Passcode` header; provides KPI summary cards, revenue & occupancy reports, walk-in reservation desk, status transitions (`Pending`, `Confirmed`, `Completed`, `Cancelled`), location & inventory CRUD, review moderation, and notification dispatch.

---

## 2. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, Axios, React Router 7, Lucide Icons |
| **Backend** | Python 3, Flask 3, Flask-CORS, `mysql-connector-python`, `python-dotenv`, `pytest` |
| **Database** | MySQL 8.0 (InnoDB Storage Engine, `utf8mb4_unicode_ci`) |
| **ER Modeling** | DIA (`Diagram1.dia`) |

---

## 3. Project Folder Structure

```text
RDBMS project/
├── Diagram1.dia                       # Original Chen ER diagram created in DIA
├── README.md                          # Project overview, setup, and startup instructions
├── .gitignore                         # Excludes .env, venv/, node_modules/, and build artifacts
├── database/
│   ├── README.md                      # Database scripts overview
│   ├── schema.sql                     # MySQL 8 DDL: 9 ER tables, PKs, FKs, CHECKs, indexes
│   ├── seed.sql                       # Fictional sample data for all 9 tables
│   ├── verification.sql               # 6 verification queries (joins, refunds, overlap checks)
│   └── rdbms_demo.sql                 # 14-section RDBMS lab demo (Views, Stored Procs, Triggers, EXPLAIN)
├── docs/
│   ├── erd_analysis.md                # Inspection of Diagram1.dia & confirmed design choices
│   ├── database_design.md             # Academic schema, keys, 3NF normalization & constraints
│   ├── api_documentation.md           # Complete REST API reference
│   ├── rdbms_concepts.md              # RDBMS theory explanations & Viva Q&A preparation
│   └── submission_checklist.md        # Final audit & submission checklist
├── backend/
│   ├── .env.example                   # Environment variable template (no real passwords)
│   ├── requirements.txt               # Python dependencies
│   ├── run.py                         # Flask server entry point
│   ├── app/
│   │   ├── __init__.py                # Flask app factory, CORS, and JSON error handlers
│   │   ├── config.py                  # Environment configuration
│   │   ├── db.py                      # MySQL 8 connection & atomic transaction context managers
│   │   ├── routes/                    # Modular REST endpoints (locations, services, users, bookings, etc.)
│   │   └── utils/                     # Validators, standardized responses, and admin passcode gate
│   └── tests/
│       ├── test_api.py                # Unit & route validation/availability/cancellation tests
│       └── test_e2e_integration.py    # End-to-end integration & transaction rollback tests
└── frontend/
    ├── .env.example                   # Frontend API base URL template
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/client.js              # Centralized Axios client
        ├── context/AppContext.jsx     # Guest session, admin passcode state, and toast notifications
        ├── components/                # Navbar, Footer, MainLayout, Button, Card, Badge, Modal, InvoiceModal
        ├── pages/                     # 11 full-featured hospitality & dashboard pages
        └── utils/media.js             # Verified photography mapping & INR/date formatters
```

---

## 4. Prerequisites (Windows)

- **MySQL Server 8.0+** and **MySQL Workbench 8.0 CE**
- **Python 3.10+**
- **Node.js 18+** and **npm**

---

## 5. MySQL Workbench Database Setup

1. Open **MySQL Workbench** and connect to your local MySQL 8 instance (`localhost:3306`).
2. **Create Schema & Tables**:
   - Open `database/schema.sql` (**File $\rightarrow$ Open SQL Script...**) and click the **⚡ Lightning Bolt** icon.
   - This creates `hotel_reservation_db` and all 9 tables (`User`, `Location`, `Services`, `Bookings`, `Payment`, `Cancellation`, `Invoices`, `Reviews`, `Notification`).
3. **Load Sample Data**:
   - Open `database/seed.sql` and click the **⚡ Lightning Bolt** icon to populate fictional demonstration records.
4. **Verify Setup (Optional)**:
   - Open `database/verification.sql` and execute it to inspect row counts, multi-table joins, and availability conflict checks.
   - For RDBMS Lab evaluation (Views, Stored Procedures, Triggers, Transactions, `EXPLAIN`), open and execute `database/rdbms_demo.sql`.

---

## 6. Environment Variable Configuration

Never commit real passwords to version control. Copy the `.env.example` templates to `.env`:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Edit `backend\.env` and set your local MySQL 8 credentials (replace the placeholder password with your local MySQL password):

```env
FLASK_ENV=development
FLASK_PORT=5000
FLASK_DEBUG=True
SECRET_KEY=replace_with_a_secure_secret_key
ADMIN_PASSCODE=admin123
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password_placeholder
DB_NAME=hotel_reservation_db
TEST_DB_NAME=hotel_reservation_test_db
```

Verify `frontend\.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 7. Installation & Startup Commands (Windows PowerShell)

### Backend Setup & Startup (`http://localhost:5000`)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\python -m pip install -r requirements.txt
.\venv\Scripts\python run.py
```

### Frontend Setup & Startup (`http://localhost:5173`)
*(Note: Use `npm.cmd` in PowerShell if script execution policy blocks `npm.ps1`)*
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

---

## 8. Running Automated Tests & Production Build Check

```powershell
# Run the 9 backend & E2E SQL integration tests
.\backend\venv\Scripts\python -m pytest backend/tests/ -v

# Verify the React + Vite + Tailwind CSS production build
cd frontend
npm.cmd run build
```

---

## 9. REST API Endpoint Summary

Full request/response schemas are documented in [`docs/api_documentation.md`](./docs/api_documentation.md).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check API status, MySQL 8 connection, and existing ER tables |
| `GET` | `/api/locations` | List all hotel properties with room counts & average ratings |
| `GET` | `/api/locations/<l_id>` | Retrieve single location and its rooms/add-on services |
| `POST / PUT` | `/api/locations[/<l_id>]` | *(Admin)* Create or update a hotel location |
| `GET` | `/api/services` | List/filter rooms and add-on services |
| `GET` | `/api/services/available` | Search available rooms/services for date range & guest count |
| `GET` | `/api/services/<s_id>` | Retrieve single room/service details & customer reviews |
| `GET` | `/api/services/<s_id>/availability` | Check exact unit availability & price quote for date range |
| `POST / PUT` | `/api/services[/<s_id>]` | *(Admin)* Create or update room/service inventory |
| `GET / POST / PUT` | `/api/users[/<u_id>]` | List, look up, register, or update guest records (`User`) |
| `GET` | `/api/bookings[/<b_id>]` | List or retrieve reservation details (`Bookings`) |
| `POST` | `/api/bookings` | Create reservation atomically (`FOR UPDATE` overlap check) |
| `POST` | `/api/bookings/<b_id>/cancel` | Cancel reservation atomically & record refund in `Cancellation` |
| `PATCH` | `/api/bookings/<b_id>/status` | *(Admin)* Update reservation status (`Pending`, `Confirmed`, `Completed`, `Cancelled`) |
| `GET` | `/api/cancellations` | Retrieve cancellation & refund audit log (`Cancellation`) |
| `GET / POST` | `/api/payments[/<p_id>]` | List payments or record simulated payment (`Payment`) |
| `GET / POST` | `/api/invoices[/<i_id>]` | List, retrieve, or generate official tax invoices (`Invoices`) |
| `GET / POST / DELETE` | `/api/reviews[/<r_id>]` | List, submit, or moderate guest reviews (`Reviews`) |
| `GET / POST` | `/api/notifications` | List or dispatch guest alerts (`Notification`) |
| `GET` | `/api/reports/summary` | System-wide KPI summary (revenue, refunds, bookings, ratings) |
| `GET` | `/api/reports/revenue` | Revenue breakdown by location, category, and payment method |
| `GET` | `/api/reports/occupancy` | Room occupancy & availability rates for a date window |

---

## 10. RDBMS Concepts Demonstrated

Detailed explanations and Viva Q&A are provided in [`docs/rdbms_concepts.md`](./docs/rdbms_concepts.md) and executable in [`database/rdbms_demo.sql`](./database/rdbms_demo.sql):
- **DDL**: `CREATE DATABASE`, `CREATE TABLE`, `ALTER TABLE`, `TRUNCATE TABLE`, `DROP TABLE`
- **DML & DQL**: Parameterized `INSERT`, `UPDATE`, `DELETE`, `SELECT`, `DISTINCT`, `WHERE`, `ORDER BY`, `LIMIT`
- **Integrity Constraints**: `PRIMARY KEY`, `FOREIGN KEY` (`ON DELETE RESTRICT` / `CASCADE`), `UNIQUE`, `NOT NULL`, `DEFAULT`, `CHECK`
- **Relationships**: $1 : 0..1$ (`Bookings` $\leftrightarrow$ `Cancellation`/`Invoices`), $1 : N$ (`Location` $\rightarrow$ `Services`, `User` $\rightarrow$ `Bookings`), and associative bridge queries
- **Joins & Set Operations**: `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `UNION ALL`
- **Aggregations & Grouping**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `GROUP BY`, `HAVING`
- **Subqueries**: Scalar, `NOT EXISTS`, and correlated subqueries
- **Database Programmability**: Views (`vw_booking_financial_summary`, `vw_location_occupancy_overview`), Stored Procedure (`sp_check_service_availability`), Trigger (`trg_after_booking_status_update`)
- **ACID Transactions & Concurrency**: `START TRANSACTION`, `COMMIT`, `ROLLBACK`, row-level locking (`FOR UPDATE`)
- **Query Optimization**: Composite B+Tree indexing (`idx_bookings_availability`) and `EXPLAIN` analysis
- **Normalization**: 1NF, 2NF, and 3NF/BCNF (including resolving the `User — makes — Payment` cycle via `Bookings.U-ID`)

---

## 11. Original ER Diagram vs. Approved Additions & Known Limitations

1. **Preserved vs. Added Attributes**:
   - In `Diagram1.dia`, `Bookings` (`O3`) had no attribute ellipses drawn on it, so minimal reservation attributes (`B-ID`, `U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`) were added with approval.
   - `Services` (`O4`) retained its 4 original attributes (`S-ID`, `Name`, `Price`, `Description`) and gained `L-ID` (FK to `Location`), `Category` (`Room`/`Add-On`), `Max_Guests`, and `Total_Units` to support multi-unit room inventory.
2. **Academic Scope Limitations & Future Enhancements**:
   - **Simulated Payment Flow**: Designed for academic demonstration; does not integrate with external payment gateways (e.g., Razorpay/Stripe) and explicitly rejects real credit card numbers.
   - **Authentication Scope**: Preserves the original `User (U-ID, Name, Phone, Email)` schema without adding password hashes or JWT tables; guest sessions identify by verified email/phone, and administrative routes use the `X-Admin-Passcode` header.
   - **1-to-Many Booking Model**: Each `Bookings` record books one `S-ID` (`Room` or `Add-On`), preserving the exact 9-table structure of `Diagram1.dia` without introducing extra junction tables.
