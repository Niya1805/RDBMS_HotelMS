# Database Scripts (`database/`)

This directory holds all MySQL 8 DDL, DML, constraint, view, trigger, and seed scripts for the **Hotel Reservation System**, strictly derived from [`Diagram1.dia`](../Diagram1.dia) and documented in [`docs/erd_analysis.md`](../docs/erd_analysis.md).

## Original ER Entities Preserved
1. **`User`** (`U-ID`, `Name`, `Phone`, `Email`)
2. **`Location`** (`L-ID`, `Name`, `Address`, `City`, `Country`)
3. **`Services`** (`S-ID`, `Name`, `Price`, `Description`, plus agreed room/service extensions: `L-ID`, `Category`, `Max_Guests`, `Total_Units`)
4. **`Bookings`** (Agreed minimal reservation attributes: `B-ID`, `U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`)
5. **`Payment`** (`P-ID`, `B-ID`, `Amt`, `Date`, `Method`)
6. **`Cancellation`** (`C-ID`, `B-ID`, `Date`, `Refund-amt`)
7. **`Invoices`** (`I-ID`, `U-ID`, `B-ID`, `Amt`, `Date`)
8. **`Reviews`** (`R-ID`, `U-ID`, `S-ID`, `Rating`, `Comment`)
9. **`Notification`** (`N-ID`, `U-ID`, `Message`)

## Implemented SQL Files (Execution Order)
1. **[`schema.sql`](./schema.sql)** — MySQL 8 database & table creation (`CREATE DATABASE`, `CREATE TABLE`) with primary keys, foreign keys, `UNIQUE`, `CHECK` constraints, and B+Tree indexes.
2. **[`seed.sql`](./seed.sql)** — Fictional demonstration data across all 9 ER entities (including completed, confirmed, cancelled, and pending reservations).
3. **[`verification.sql`](./verification.sql)** — 6 verification queries testing row counts, multi-table joins, 3NF user-payment resolution, cancellation refunds, and date-conflict availability checks.
4. **[`rdbms_demo.sql`](./rdbms_demo.sql)** — 14-section RDBMS Lab & Theory demonstration script (DDL, DML, DQL, constraints, joins, aggregations, `GROUP BY`/`HAVING`, subqueries, views, stored procedures, triggers, ACID transactions, and `EXPLAIN`).
