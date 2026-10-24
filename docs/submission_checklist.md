# RDBMS Project — Final Audit & Submission Checklist

**Project:** Grand Aurelia — Hotel Reservation System  
**ER Diagram Source:** [`Diagram1.dia`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/Diagram1.dia)

---

## 1. Required Project Files Checklist

| Category | File Path | Status | Purpose |
| :--- | :--- | :--- | :--- |
| **ER Diagram** | [`Diagram1.dia`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/Diagram1.dia) | ✅ Present | Original DIA ER diagram (9 Entities, 35 Attribute Ellipses, 9 Relationship Diamonds). |
| **Root Config** | [`README.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/README.md) | ✅ Complete | Installation, MySQL Workbench guide, startup commands, API summary, RDBMS concepts. |
| **Root Config** | [`.gitignore`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/.gitignore) | ✅ Complete | Excludes `.env`, `venv/`, `node_modules/`, and build artifacts. |
| **Database** | [`database/schema.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/schema.sql) | ✅ Complete | MySQL 8 DDL creating `hotel_reservation_db` and all 9 ER tables, keys, constraints, and indexes. |
| **Database** | [`database/seed.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/seed.sql) | ✅ Complete | Fictional sample data across all 9 tables (6 users, 4 locations, 10 services, 8 bookings, etc.). |
| **Database** | [`database/verification.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/verification.sql) | ✅ Complete | 6 verification queries (row counts, multi-table joins, refunds, date-overlap availability). |
| **Database** | [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql) | ✅ Complete | 14-section RDBMS lab demo (DDL, DML, DQL, joins, views, stored proc, trigger, transactions, `EXPLAIN`). |
| **Docs** | [`docs/erd_analysis.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/docs/erd_analysis.md) | ✅ Complete | Extracted `Diagram1.dia` objects (`O0`–`O105`), ambiguities, and confirmed additions. |
| **Docs** | [`docs/database_design.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/docs/database_design.md) | ✅ Complete | Academic table dictionary, keys, cardinalities, 1NF/2NF/3NF normalization, and indexing. |
| **Docs** | [`docs/api_documentation.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/docs/api_documentation.md) | ✅ Complete | Full REST API specification (methods, parameters, JSON responses, error codes). |
| **Docs** | [`docs/rdbms_concepts.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/docs/rdbms_concepts.md) | ✅ Complete | RDBMS theory guide, ACID walkthrough, and 7 Viva Voce Q&A pairs. |
| **Docs** | [`docs/submission_checklist.md`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/docs/submission_checklist.md) | ✅ Complete | This final audit and submission preparation checklist. |
| **Backend** | [`backend/requirements.txt`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/requirements.txt) & [`.env.example`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/.env.example) | ✅ Complete | Flask, Flask-CORS, `mysql-connector-python`, `python-dotenv`, `pytest`. |
| **Backend** | [`backend/app/`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app) & [`backend/tests/`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/tests) | ✅ Complete | Modular routes, validators, atomic transactions, and 9 automated integration tests. |
| **Frontend** | [`frontend/package.json`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/frontend/package.json) & [`.env.example`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/frontend/.env.example) | ✅ Complete | React 18, Vite 6, Tailwind CSS 4, Axios, React Router 7. |
| **Frontend** | [`frontend/src/`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/frontend/src) | ✅ Complete | 11 hospitality pages, reusable UI components, printable invoice modal, and admin console. |

---

## 2. Database Setup Checklist (MySQL Workbench 8.0)

- [ ] **1. Verify MySQL Server is running** on Windows (`MySQL267` service at `localhost:3306`).
- [ ] **2. Execute [`database/schema.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/schema.sql)** in MySQL Workbench to create `hotel_reservation_db` and the 9 tables (`User`, `Location`, `Services`, `Bookings`, `Payment`, `Cancellation`, `Invoices`, `Reviews`, `Notification`).
- [ ] **3. Execute [`database/seed.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/seed.sql)** to insert the sample hotel locations, rooms/add-ons, guests, bookings, payments, cancellations, invoices, reviews, and notifications.
- [ ] **4. Execute [`database/verification.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/verification.sql)** and confirm all 6 result grids return data without error.
- [ ] **5. Execute [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql)** to create the views (`vw_booking_financial_summary`, `vw_location_occupancy_overview`), stored procedure (`sp_check_service_availability`), audit table (`Booking_Status_Audit`), and trigger (`trg_after_booking_status_update`).

---

## 3. Environment, Backend & Frontend Startup Checklist

- [ ] **1. Configure `backend/.env`**:
  Open [`backend/.env`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/.env) and set `DB_PASSWORD` to your actual local MySQL `root` password.
- [ ] **2. Start the Flask Backend**:
  ```powershell
  cd backend
  .\venv\Scripts\python run.py
  ```
- [ ] **3. Verify `http://localhost:5000/api/health`**:
  Confirm `"connected": true` and all 9 tables appear under `"existing_tables"`.
- [ ] **4. Start the React Frontend**:
  ```powershell
  cd frontend
  npm.cmd run dev
  ```
- [ ] **5. Open `http://localhost:5173`** in your browser.

---

## 4. SQL Demonstration Checklist (For Lab Evaluation)

During your lab evaluation, you can highlight and execute individual blocks in [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql):
- [ ] **Section 1**: Safe DDL (`CREATE`, `ALTER`, `TRUNCATE`, `DROP` on `Demo_Promo_Offers`).
- [ ] **Section 2**: Safe DML (`INSERT`, `UPDATE`, `DELETE` of demo guest `U-ID = 900`).
- [ ] **Section 3**: DQL (`SELECT DISTINCT`, `WHERE`, `ORDER BY`, `LIMIT`).
- [ ] **Section 4**: Inspect `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, and `CHECK` constraints via `INFORMATION_SCHEMA`.
- [ ] **Section 5 & 6**: $1:0..1$ and $1:N$ relationships + `INNER JOIN`, `LEFT JOIN`, and `RIGHT JOIN`.
- [ ] **Section 7 & 8**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` with `GROUP BY` and `HAVING`.
- [ ] **Section 9**: Scalar, `NOT EXISTS`, and correlated subqueries.
- [ ] **Section 10**: Query views `vw_booking_financial_summary` and `vw_location_occupancy_overview`.
- [ ] **Section 11**: Call stored procedure `CALL sp_check_service_availability(1, '2026-11-20', '2026-11-23', 2);`.
- [ ] **Section 12**: Show trigger `trg_after_booking_status_update` logging into `Booking_Status_Audit`.
- [ ] **Section 13**: Demonstrate `START TRANSACTION` $\rightarrow$ `INSERT` $\rightarrow$ `SELECT` $\rightarrow$ `ROLLBACK` $\rightarrow$ `SELECT`.
- [ ] **Section 14**: Run `EXPLAIN` on the availability query using composite index `idx_bookings_availability`.

---

## 5. Recommended Screenshots to Capture for Your Report

1. **Original ER Diagram (`Diagram1.dia`)**: Screenshot of `Diagram1.dia` open in DIA (or the exported diagram image).
2. **MySQL Workbench Schema Navigator & EER Diagram**: Showing `hotel_reservation_db` with all 9 tables, views, stored procedures, and triggers expanded.
3. **MySQL Workbench Query Results**:
   - Output of `verification.sql` Query #2 (multi-table join across `Bookings`, `User`, `Services`, `Location`, `Payment`, `Invoices`).
   - Output of `verification.sql` Query #4 (room availability & date-overlap calculation showing cancelled Booking #4 ignored).
   - Output of `rdbms_demo.sql` Section 12 (`Booking_Status_Audit` populated by the trigger) and Section 14 (`EXPLAIN` showing `idx_bookings_availability`).
4. **Website Public Pages**:
   - **Home Page (`/`)**: Hero search bar, Signature Destinations (`Location`), and Featured Offerings (`Services`).
   - **Search Results Page (`/search`)**: Real-time unit availability badges (`X of Y Left` / `Sold Out`).
   - **Room Detail & Availability Calculator (`/services/4`)**: Showing live availability and guest reviews.
   - **Reservation Checkout (`/checkout/4`)**: Showing guest selection and the Simulated Academic Payment Flow.
   - **Booking Confirmation & Printable Tax Invoice (`/booking-confirmation/3`)**: With the official `InvoiceModal` open.
5. **Guest & Admin Portals**:
   - **Guest Dashboard (`/dashboard`)**: Reservations, Payments & Invoices, and Notifications tabs.
   - **Admin & Reception Console (`/admin`)**: KPI Summary Cards, Revenue & Occupancy Reports, and Reception Desk table.

---

## 6. Features Tested & Verified Successfully

- ✅ **Frontend Production Build**: `vite build` succeeded cleanly (`1,669 modules transformed`).
- ✅ **Backend & E2E SQL Test Suite**: All 9 `pytest` tests in `backend/tests/test_api.py` and `backend/tests/test_e2e_integration.py` passed (`9 passed in 0.48s`).
- ✅ **Live Flask HTTP & CORS Verification**: Verified `GET /api/health` returns `200 OK` with `Access-Control-Allow-Origin: http://localhost:5173`.
- ✅ **Date-Overlap & Double-Booking Prevention**: Confirmed that active (`Pending`/`Confirmed`) overlapping bookings block availability when `active_overlaps >= Total_Units`, while `Cancelled` bookings and adjacent non-overlapping dates (`Check_Out_1 == Check_In_2`) do not block availability.
- ✅ **Atomic Transaction Rollback**: Verified that mid-transaction failures trigger `conn.rollback()`, leaving zero orphaned rows across `Bookings`, `Payment`, and `Invoices`.
- ✅ **Error Sanitization & Admin Authorization**: Verified that database connection errors never leak passwords/stack traces (`503 DB_UNAVAILABLE`), raw credit card numbers are rejected (`400`), and admin routes require `X-Admin-Passcode` (`403 ADMIN_FORBIDDEN`).

---

## 7. Remaining Item Requiring Your Local Input

- ⚠️ **Local MySQL Password in `backend/.env`**:
  Because real passwords are never hardcoded or committed, [`backend/.env`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/.env) currently contains `DB_PASSWORD=your_mysql_password_placeholder`. Update `DB_PASSWORD` in `backend/.env` with your local MySQL password and execute `database/schema.sql` + `database/seed.sql` in MySQL Workbench before starting the live servers.
