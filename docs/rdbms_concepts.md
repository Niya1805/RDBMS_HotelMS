# RDBMS Concepts, SQL Demonstrations & Viva Preparation Guide

**Project:** Hotel Reservation System (Grand Aurelia Hotels & Resorts)  
**Database Schema:** [`database/schema.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/schema.sql)  
**Executable SQL Lab Script:** [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql)  
**Backend Transaction Implementation:** [`backend/app/db.py`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app/db.py), [`backend/app/routes/bookings.py`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app/routes/bookings.py)

---

## 1. DDL (Data Definition Language): `CREATE`, `ALTER`, `TRUNCATE`, `DROP`

DDL commands define and modify the structure (schema) of database objects in the data dictionary. Every DDL command in MySQL implicitly issues a `COMMIT`.

- **`CREATE TABLE`**: Defines a new relation with attributes, data types, and integrity constraints. In [`database/schema.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/schema.sql), all 9 ER entities (`User`, `Location`, `Services`, `Bookings`, `Payment`, `Cancellation`, `Invoices`, `Reviews`, `Notification`) are created with InnoDB and `utf8mb4`.
- **`ALTER TABLE`**: Modifies an existing table's structure (`ADD COLUMN`, `MODIFY COLUMN`, `DROP COLUMN`, `ADD CONSTRAINT`).
- **`TRUNCATE TABLE`**: Removes all rows from a table rapidly by deallocating data pages and resetting `AUTO_INCREMENT` counters, while preserving the table's schema.
- **`DROP TABLE`**: Permanently removes both the table data and its schema definition from the database catalog.

> [!CAUTION]
> In [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql) (Section 1), `ALTER`, `TRUNCATE`, and `DROP` are demonstrated on a dedicated temporary scratch table (`Demo_Promo_Offers`) so that your 9 core ER tables and seed records remain completely intact.

---

## 2. DML (Data Manipulation Language): `INSERT`, `UPDATE`, `DELETE`

DML commands manipulate the tuples (rows) stored inside tables and participate in ACID transactions.

- **`INSERT INTO`**: Adds new rows (e.g., registering a new guest in `` `User` (`Name`, `Phone`, `Email`) `` or creating a reservation in `` `Bookings` ``).
- **`UPDATE`**: Modifies existing attribute values for rows matching a `WHERE` predicate (e.g., `UPDATE \`Bookings\` SET \`Status\` = 'Cancelled' WHERE \`B-ID\` = 4;`).
- **`DELETE FROM`**: Removes matching rows while respecting foreign key referential integrity constraints (`ON DELETE RESTRICT` vs. `ON DELETE CASCADE`).

---

## 3. DQL (Data Query Language): `SELECT`, `WHERE`, `ORDER BY`, `DISTINCT`, `LIMIT`

- **Projection (`SELECT`)**: Chooses specific attributes from one or more relations.
- **Duplicate Elimination (`DISTINCT`)**: Eliminates duplicate rows in the result set, such as listing unique cities where hotels operate:
  ```sql
  SELECT DISTINCT `City`, `Country` FROM `Location` ORDER BY `City` ASC;
  ```
- **Selection Predicate (`WHERE`)**: Filters tuples before grouping (`WHERE \`Category\` = 'Room' AND \`Price\` >= 8000.00`).
- **Sorting (`ORDER BY`) & Pagination (`LIMIT`)**: Orders tuples (`ASC`/`DESC`) and bounds the output cardinality (`LIMIT 5`).

---

## 4. Keys & Domain Integrity Constraints

| Constraint Type | Implementation in `hotel_reservation_db` | RDBMS Purpose |
| :--- | :--- | :--- |
| **`PRIMARY KEY`** | `` `U-ID` ``, `` `L-ID` ``, `` `S-ID` ``, `` `B-ID` ``, `` `P-ID` ``, `` `C-ID` ``, `` `I-ID` ``, `` `R-ID` ``, `` `N-ID` `` | Enforces **Entity Integrity** (uniquely identifies each tuple; implicitly `NOT NULL` and indexed via a clustered B+Tree in InnoDB). |
| **`FOREIGN KEY`** | `Services.L-ID` $\rightarrow$ `Location.L-ID`<br>`Bookings.U-ID` $\rightarrow$ `User.U-ID`<br>`Bookings.S-ID` $\rightarrow$ `Services.S-ID`<br>`Payment.B-ID` $\rightarrow$ `Bookings.B-ID`<br>`Cancellation.B-ID` $\rightarrow$ `Bookings.B-ID`<br>`Invoices.U-ID`, `Invoices.B-ID`<br>`Reviews.U-ID`, `Reviews.S-ID`<br>`Notification.U-ID` | Enforces **Referential Integrity** (prevents orphaned child records; configured with `ON DELETE RESTRICT` for financial/booking records and `ON DELETE CASCADE` for reviews/notifications). |
| **`UNIQUE`** | `uq_user_phone` (`User.Phone`)<br> `uq_user_email` (`User.Email`)<br>`uq_cancellation_booking` (`Cancellation.B-ID`)<br>`uq_invoices_booking` (`Invoices.B-ID`) | Enforces candidate key uniqueness and $1 : 0..1$ relationship cardinalities. |
| **`NOT NULL`** | Applied to all mandatory attributes across all 9 tables | Prevents unknown/missing (`NULL`) values in critical fields. |
| **`DEFAULT`** | `Location.Country DEFAULT 'India'`<br>`Bookings.Status DEFAULT 'Pending'`<br>`Payment.Date DEFAULT CURRENT_TIMESTAMP` | Supplies a fallback value when an `INSERT` omits the column. |
| **`CHECK`** | `chk_bookings_dates` (`Check_Out > Check_In`)<br>`chk_services_price` (`Price > 0.00`)<br>`chk_reviews_rating` (`Rating BETWEEN 1 AND 5`)<br>`chk_cancellation_refund` (`Refund-amt >= 0.00`) | Enforces **Domain Integrity** directly inside MySQL 8.0.16+. |

---

## 5. Relationships & Cardinalities in the Schema

1. **One-to-Zero-or-One ($1 : 0..1$):**
   - `Bookings` $\leftrightarrow$ `Cancellation` and `Bookings` $\leftrightarrow$ `Invoices`.
   - Enforced by placing a `FOREIGN KEY` (`B-ID`) **and** a `UNIQUE` constraint (`uq_cancellation_booking`, `uq_invoices_booking`) on the child table so a booking can have at most one cancellation record and one invoice.
2. **One-to-Many ($1 : N$):**
   - `Location` ($1$) $\rightarrow$ `Services` ($N$) via `Services.L-ID`
   - `User` ($1$) $\rightarrow$ `Bookings` ($N$) via `Bookings.U-ID`
   - `Services` ($1$) $\rightarrow$ `Bookings` ($N$) via `Bookings.S-ID`
   - `Bookings` ($1$) $\rightarrow$ `Payment` ($N$) via `Payment.B-ID`
   - `User` ($1$) $\rightarrow$ `Notification` ($N$) via `Notification.U-ID`
3. **Associative / Many-to-Many Bridge Relationship ($M : N$ across Entities):**
   - While no extra junction table beyond the 9 ER entities was added, **`Bookings`** and **`Reviews`** act as associative entities bridging **`User`** and **`Services`**: one `User` can book or review many `Services`, and one `Services` offering can be booked or reviewed by many `User` records over time.

---

## 6. Relational Joins (`INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`)

- **`INNER JOIN`**: Returns only tuples that have matching join keys in both tables (e.g., joining `Bookings`, `User`, `Services`, `Location`, and `Payment` for paid reservations).
- **`LEFT OUTER JOIN` (`LEFT JOIN`)**: Returns all tuples from the left table (`Services`) and matching tuples from the right table (`Reviews` or `Bookings`), filling unmatched right-side attributes with `NULL`. Essential for counting `0` reviews or `0` overlapping bookings (`COUNT(b.\`B-ID\`) = 0`).
- **`RIGHT OUTER JOIN` (`RIGHT JOIN`)**: Returns all tuples from the right table (`Bookings`) and matching rows from the left table (`Payment`), exposing unpaid `'Pending'` bookings (such as Booking #8) where `Payment.P-ID IS NULL`.

---

## 7. Aggregate Functions, `GROUP BY`, and `HAVING`

- **Aggregate Functions**:
  - `COUNT()`: Counts rows or non-null values (e.g., `COUNT(b.\`B-ID\`)` for active overlapping bookings).
  - `SUM()`: Computes total monetary amounts (`SUM(p.\`Amt\`)` for gross revenue, `SUM(c.\`Refund-amt\`)` for total refunds).
  - `AVG()`: Computes arithmetic mean (`ROUND(AVG(r.\`Rating\`), 2)` for average guest rating).
  - `MIN()` and `MAX()`: Identify minimum and maximum prices (`MIN(s.\`Price\`)`, `MAX(s.\`Price\`)`).
- **`GROUP BY` vs. `HAVING`**:
  - `WHERE` filters individual rows **before** grouping.
  - `GROUP BY` partitions rows into summary groups (e.g., `GROUP BY l.\`L-ID\`, l.\`Name\`, l.\`City\``).
  - `HAVING` filters the aggregated groups **after** `GROUP BY` (e.g., `HAVING SUM(p.\`Amt\`) > 40000.00`).

---

## 8. Subqueries (Nested & Correlated)

Implemented in Section 9 of [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql):
1. **Uncorrelated Scalar Subquery**: Inner query executes once to compute `SELECT AVG(\`Price\`) FROM \`Services\` WHERE \`Category\` = 'Room'`, and the outer query selects rooms priced above that average.
2. **`NOT EXISTS` Subquery**: Identifies guests in `User` who have zero rows in `Bookings` joined with `Cancellation`.
3. **Correlated Subquery**: Finds offerings in `Services` (`s1`) whose `Price` exceeds the average price of offerings at the **same hotel location** (`WHERE s2.\`L-ID\` = s1.\`L-ID\``).

---

## 9. Views, Stored Procedures, and Triggers

All three database programmability objects are created and executed in [`database/rdbms_demo.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/rdbms_demo.sql):

1. **Views (`CREATE OR REPLACE VIEW`)**:
   - `vw_booking_financial_summary`: Virtual relation joining `Bookings`, `User`, `Services`, `Location`, `Payment`, `Invoices`, and `Cancellation` to expose `Paid_Amt`, `Refund_Amt`, and `Net_Retained_Amt`.
   - `vw_location_occupancy_overview`: Virtual relation summarizing room inventory, active bookings, cancelled bookings, and average rating per hotel `Location`.
2. **Stored Procedure (`sp_check_service_availability`)**:
   - Accepts `(p_s_id, p_check_in, p_check_out, p_guests)` and returns the exact count of active overlapping bookings, remaining available units, capacity validation status, and estimated stay total.
3. **Trigger (`trg_after_booking_status_update`)**:
   - Defined as `AFTER UPDATE ON \`Bookings\` FOR EACH ROW`. Whenever `OLD.Status <> NEW.Status`, it automatically inserts an immutable audit trail entry into `Booking_Status_Audit (B-ID, Old_Status, New_Status, Changed_At)`.

---

## 10. Transactions & ACID Properties in Reservation & Payment Flows

In [`backend/app/db.py`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app/db.py) (`db_transaction()`) and [`backend/app/routes/bookings.py`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/backend/app/routes/bookings.py), creating or cancelling a reservation executes inside a single SQL transaction (`autocommit=False`, `COMMIT` on success, `ROLLBACK` on exception):

1. **Atomicity ("All or Nothing")**:
   - When a guest books a room with simulated payment (`POST /api/bookings`), the backend executes four writes: (1) `INSERT INTO Bookings`, (2) `INSERT INTO Payment`, (3) `INSERT INTO Invoices`, and (4) `INSERT INTO Notification`. If any step fails, `conn.rollback()` undoes all prior inserts so a guest is never charged without a confirmed booking or left with an un-invoiced payment.
2. **Consistency**:
   - Every transaction transitions the database from one valid state to another, preserving all `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, and `CHECK` constraints (`Check_Out > Check_In`, `Guests <= Max_Guests`, `active_overlaps < Total_Units`).
3. **Isolation**:
   - During reservation creation (`POST /api/bookings`), the backend locks the target service row using `SELECT ... FROM \`Services\` WHERE \`S-ID\` = %s FOR UPDATE` and checks active overlapping rows with `FOR UPDATE`. This serializes concurrent requests for the same room so two guests cannot simultaneously book the last remaining unit.
4. **Durability**:
   - Once `conn.commit()` completes, InnoDB flushes the redo log to disk, guaranteeing that confirmed bookings, payments, and cancellation refunds survive server restarts.

---

## 11. Indexes & `EXPLAIN` Execution Analysis

Our most frequent performance-critical query is the date-range overlap check on `Bookings`:
```sql
EXPLAIN
SELECT COUNT(`B-ID`) AS Overlapping_Active_Bookings
FROM `Bookings`
WHERE `S-ID` = 4
  AND `Status` IN ('Pending', 'Confirmed')
  AND `Check_In` < '2026-11-18'
  AND `Check_Out` > '2026-11-15';
```
Because [`database/schema.sql`](file:///c:/Users/anany/OneDrive/Desktop/RDBMS%20project/database/schema.sql) defines the composite B+Tree index:
```sql
CREATE INDEX idx_bookings_availability ON `Bookings` (`S-ID`, `Status`, `Check_In`, `Check_Out`);
```
MySQL's query optimizer uses `idx_bookings_availability` as a **covering index** (`Extra: Using where; Using index`), resolving the overlap count directly from the index tree without scanning full table data pages (`type: range` / `ref` instead of `ALL`).

---

## 12. Normalization & Elimination of Anomalies

1. **1NF**: All attributes across all 9 tables store atomic scalar values, and every table has a primary key.
2. **2NF**: All 9 tables have single-column primary keys (`U-ID`, `L-ID`, `S-ID`, `B-ID`, `P-ID`, `C-ID`, `I-ID`, `R-ID`, `N-ID`), eliminating any possibility of partial functional dependencies.
3. **3NF & Anomaly Prevention**:
   - **Separation of `Location` and `Services`**: Hotel address and city are stored once in `Location` (`L-ID`) rather than repeated on every room in `Services`.
     - *Prevents Update Anomaly*: Updating a hotel's street address requires updating 1 row in `Location`, not dozens of rows in `Services`.
     - *Prevents Deletion Anomaly*: Deleting the last booking or service at a location does not erase the `Location` record.
     - *Prevents Insertion Anomaly*: A new hotel property (`Location`) can be added before any rooms (`Services`) or `Bookings` exist.
   - **3NF Resolution of `User — makes — Payment`**: Because `Payment` references `B-ID` and `Bookings` references `U-ID` ($\text{P-ID} \rightarrow \text{B-ID} \rightarrow \text{U-ID}$), `U-ID` is omitted from `Payment` to avoid transitive dependency.

---

## 13. Viva Voce Preparation — Questions & Answers

### Q1: Why were `Check_In`, `Check_Out`, `Guests`, and `Status` added to `Bookings` when they were not drawn as ellipses in `Diagram1.dia`?
**Answer:** In `Diagram1.dia`, the `Bookings` rectangle (`O3`) was drawn at the center of four relationship diamonds (`makes`, `has`, and two `have` diamonds), and its primary key `B-ID` was referenced as a foreign key in `Payment`, `Cancellation`, and `Invoices`, but its own attribute ellipses were accidentally omitted in the drawing. Without `B-ID`, `U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, and `Status`, a relational database cannot link a booking to a guest/room or test for date conflicts.

### Q2: How does your SQL query detect overlapping room reservations and prevent double-booking?
**Answer:** Two date intervals $[A_{\text{start}}, A_{\text{end}})$ and $[B_{\text{start}}, B_{\text{end}})$ overlap if and only if $A_{\text{start}} < B_{\text{end}}$ AND $A_{\text{end}} > B_{\text{start}}$. Our query counts existing bookings for the same `S-ID` where `Status IN ('Pending', 'Confirmed') AND Check_In < @req_check_out AND Check_Out > @req_check_in`. If `COUNT(B-ID) < Services.Total_Units`, the room is available; otherwise the backend rejects the booking with `409 Conflict`.

### Q3: Why don't cancelled reservations block future guests from booking the same room on the same dates?
**Answer:** When a booking is cancelled (`POST /api/bookings/<b_id>/cancel`), a transaction updates `Bookings.Status` to `'Cancelled'` and inserts the refund record into `Cancellation`. Because the availability query explicitly filters for `Status IN ('Pending', 'Confirmed')`, cancelled rows are excluded from active overlaps. Furthermore, if another guest books the same dates (`Nov 15` $\rightarrow$ `Nov 18`), `Check_Out = Nov 15` on an adjacent booking also does not conflict because we use strict inequality (`<` and `>`), allowing same-day turnover.

### Q4: Why did you not store `U-ID` inside the `Payment` table even though `Diagram1.dia` had a `makes` diamond between `User` and `Payment`?
**Answer:** In `Diagram1.dia`, `Payment` only had the attributes `(P-ID, B-ID, Amt, Date, Method)`. Since every `Payment` belongs to one `Booking` (`B-ID`) and every `Booking` belongs to one `User` (`U-ID`), functional dependency $\text{P-ID} \rightarrow \text{B-ID} \rightarrow \text{U-ID}$ holds. Storing `U-ID` inside `Payment` would create a transitive dependency violating Third Normal Form (3NF) and could cause an anomaly where a payment's `U-ID` disagrees with its booking's `U-ID`. Instead, we resolve the paying user via `INNER JOIN Bookings b ON p.\`B-ID\` = b.\`B-ID\``.

### Q5: How do you enforce that a booking can be cancelled at most once in MySQL?
**Answer:** In the `Cancellation` table, the foreign key column `` `B-ID` `` also has a `UNIQUE` constraint (`CONSTRAINT uq_cancellation_booking UNIQUE (\`B-ID\`)`). This converts the relationship between `Bookings` and `Cancellation` into $1 : 0..1$, so MySQL rejects any duplicate cancellation row for the same `B-ID` with Error 1062 (`Duplicate entry`).

### Q6: Why did you use `DECIMAL(10, 2)` instead of `FLOAT` or `DOUBLE` for `Services.Price`, `Payment.Amt`, `Invoices.Amt`, and `Cancellation.Refund-amt`?
**Answer:** `FLOAT` and `DOUBLE` use binary floating-point representation (IEEE 754), which introduces rounding inaccuracies for base-10 currency values (e.g., `0.1 + 0.2 != 0.3`). `DECIMAL(10, 2)` is an exact fixed-point numeric type, ensuring rupee and paise calculations (`Amt` and `Refund-amt`) are 100% exact.

### Q7: What happens if two users click "Confirm Reservation" at the exact same millisecond for a villa with `Total_Units = 1`?
**Answer:** Inside `POST /api/bookings`, the Flask backend opens a transaction and executes `SELECT ... FROM Services WHERE \`S-ID\` = %s FOR UPDATE` followed by the overlap count query with `FOR UPDATE`. InnoDB places an exclusive row lock (`X-lock`) on that service record until the first transaction commits or rolls back, forcing the second transaction to wait and see the newly inserted booking, which then cleanly returns `409 OVERLAPPING_RESERVATION`.
