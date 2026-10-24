-- ============================================================================
-- Hotel Reservation System — RDBMS Lab & Theory Demonstration Script (rdbms_demo.sql)
-- Target DBMS: MySQL 8.0+
-- Prerequisite: Execute database/schema.sql and database/seed.sql first.
-- ============================================================================

USE hotel_reservation_db;

-- ============================================================================
-- SECTION 1: DDL (Data Definition Language) — CREATE, ALTER, TRUNCATE, DROP
-- Safe Demonstration: Creates an audit table (used by our Trigger in Section 12)
-- and a temporary scratch table to demonstrate ALTER, TRUNCATE, and DROP safely
-- without destroying any of the 9 core ER tables or seeded records.
-- ============================================================================

-- 1.1 CREATE TABLE (Audit log table for Booking status transitions)
DROP TABLE IF EXISTS `Booking_Status_Audit`;
CREATE TABLE `Booking_Status_Audit` (
    `Audit_ID`   INT AUTO_INCREMENT PRIMARY KEY,
    `B-ID`       INT NOT NULL,
    `Old_Status` VARCHAR(20) NOT NULL,
    `New_Status` VARCHAR(20) NOT NULL,
    `Changed_At` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Safe Scratch Table for ALTER, TRUNCATE, and DROP Demonstrations
DROP TABLE IF EXISTS `Demo_Promo_Offers`;
CREATE TABLE `Demo_Promo_Offers` (
    `Promo_ID`     INT AUTO_INCREMENT PRIMARY KEY,
    `Promo_Code`   VARCHAR(30) NOT NULL UNIQUE,
    `Discount_Pct` DECIMAL(5, 2) NOT NULL DEFAULT 10.00
);

-- 1.3 ALTER TABLE (Add a column, modify a column, drop a column)
ALTER TABLE `Demo_Promo_Offers`
    ADD COLUMN `Valid_Until` DATE NULL AFTER `Discount_Pct`;

ALTER TABLE `Demo_Promo_Offers`
    MODIFY COLUMN `Promo_Code` VARCHAR(50) NOT NULL;

INSERT INTO `Demo_Promo_Offers` (`Promo_Code`, `Discount_Pct`, `Valid_Until`)
VALUES ('HERITAGE2026', 15.00, '2026-12-31');

SELECT * FROM `Demo_Promo_Offers`;

-- 1.4 TRUNCATE TABLE (Removes all rows from the scratch table while keeping structure)
TRUNCATE TABLE `Demo_Promo_Offers`;

-- 1.5 DROP TABLE (Removes the temporary scratch table completely)
DROP TABLE `Demo_Promo_Offers`;

/*
  [WARNING — DESTRUCTIVE DDL ON CORE TABLES]
  Do NOT run TRUNCATE or DROP on the 9 core ER tables (`User`, `Location`, `Services`,
  `Bookings`, `Payment`, `Cancellation`, `Invoices`, `Reviews`, `Notification`) during
  a live demonstration unless you intend to re-run `schema.sql` and `seed.sql`.
*/


-- ============================================================================
-- SECTION 2: DML (Data Manipulation Language) — INSERT, UPDATE, DELETE
-- Demonstrates inserting a temporary guest record (U-ID = 900), updating their
-- phone number, verifying the update, and deleting the temporary record cleanly.
-- ============================================================================

-- 2.1 INSERT
INSERT INTO `User` (`U-ID`, `Name`, `Phone`, `Email`)
VALUES (900, 'Lab Evaluator Demo Guest', '+91-99999-00900', 'evaluator.demo@example.com');

SELECT * FROM `User` WHERE `U-ID` = 900;

-- 2.2 UPDATE
UPDATE `User`
SET `Phone` = '+91-99999-88888', `Name` = 'Lab Evaluator (Updated)'
WHERE `U-ID` = 900;

SELECT * FROM `User` WHERE `U-ID` = 900;

-- 2.3 DELETE
DELETE FROM `User` WHERE `U-ID` = 900;


-- ============================================================================
-- SECTION 3: DQL (Data Query Language) — SELECT, WHERE, ORDER BY, DISTINCT, LIMIT
-- ============================================================================

-- 3.1 DISTINCT: List all unique cities where Grand Aurelia operates
SELECT DISTINCT `City`, `Country`
FROM `Location`
ORDER BY `City` ASC;

-- 3.2 WHERE + ORDER BY + LIMIT: Top 5 premium rooms priced >= 8000 INR sorted by price
SELECT
    `S-ID`,
    `Name`,
    `Category`,
    `Price`,
    `Max_Guests`,
    `Total_Units`
FROM `Services`
WHERE `Category` = 'Room'
  AND `Price` >= 8000.00
ORDER BY `Price` DESC
LIMIT 5;


-- ============================================================================
-- SECTION 4: Keys & Integrity Constraints Inspection
-- (PRIMARY KEY, FOREIGN KEY, NOT NULL, UNIQUE, DEFAULT, CHECK)
-- ============================================================================

-- 4.1 Inspect all Primary Key, Foreign Key, Unique, and Check constraints in our schema
SELECT
    tc.TABLE_NAME,
    tc.CONSTRAINT_NAME,
    tc.CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
WHERE tc.TABLE_SCHEMA = 'hotel_reservation_db'
ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_TYPE;

-- 4.2 Inspect exact CHECK constraint expressions enforced by MySQL 8
SELECT
    cc.CONSTRAINT_NAME,
    cc.CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS cc
WHERE cc.CONSTRAINT_SCHEMA = 'hotel_reservation_db';

/*
  Constraint Violation Demonstrations (Uncomment individually in MySQL Workbench to show Error 3819 / 1062):
  -- Violates chk_bookings_dates (`Check_Out` > `Check_In`):
  -- INSERT INTO `Bookings` (`U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`)
  -- VALUES (1, 1, '2026-12-10', '2026-12-09', 2, 'Pending');

  -- Violates chk_reviews_rating (`Rating` BETWEEN 1 AND 5):
  -- INSERT INTO `Reviews` (`U-ID`, `S-ID`, `Rating`, `Comment`)
  -- VALUES (1, 1, 6, 'Invalid rating above 5');
*/


-- ============================================================================
-- SECTION 5: Relationships & Cardinalities in the Actual Schema
-- ============================================================================

-- 5.1 One-to-Zero-or-One (1 : 0..1) — Bookings to Cancellation (enforced by uq_cancellation_booking)
SELECT
    b.`B-ID`,
    b.`Status`,
    c.`C-ID`,
    c.`Refund-amt`,
    c.`Date` AS Cancelled_At
FROM `Bookings` b
INNER JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`;

-- 5.2 One-to-Many (1 : N) — One Location has many Services (Rooms & Add-Ons)
SELECT
    l.`L-ID`,
    l.`Name` AS Hotel_Property,
    l.`City`,
    s.`S-ID`,
    s.`Name` AS Offering_Name,
    s.`Category`,
    s.`Price`
FROM `Location` l
INNER JOIN `Services` s ON l.`L-ID` = s.`L-ID`
ORDER BY l.`L-ID`, s.`S-ID`;

-- 5.3 Associative / Bridge Relationship — User <-> Services via Bookings and Reviews
-- (One User can book/review multiple Services; one Service can be booked/reviewed by multiple Users)
SELECT
    u.`U-ID`,
    u.`Name` AS Guest_Name,
    s.`S-ID`,
    s.`Name` AS Service_Name,
    b.`B-ID` AS Booking_Ref,
    r.`Rating` AS Guest_Rating
FROM `User` u
INNER JOIN `Bookings` b ON u.`U-ID` = b.`U-ID`
INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
LEFT JOIN  `Reviews` r  ON r.`U-ID` = u.`U-ID` AND r.`S-ID` = s.`S-ID`;


-- ============================================================================
-- SECTION 6: Relational Joins (INNER JOIN, LEFT JOIN, RIGHT JOIN)
-- ============================================================================

-- 6.1 INNER JOIN: Confirmed or Completed bookings with guest, service, location, and payment details
SELECT
    b.`B-ID`,
    u.`Name` AS Guest,
    l.`City`,
    s.`Name` AS Room_Or_Service,
    b.`Check_In`,
    b.`Check_Out`,
    p.`Amt` AS Paid_INR,
    p.`Method`
FROM `Bookings` b
INNER JOIN `User` u     ON b.`U-ID` = u.`U-ID`
INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
INNER JOIN `Payment` p  ON b.`B-ID` = p.`B-ID`;

-- 6.2 LEFT JOIN: List all Services, including those that have 0 reviews so far
SELECT
    s.`S-ID`,
    s.`Name` AS Service_Name,
    s.`Category`,
    COUNT(r.`R-ID`) AS Review_Count,
    COALESCE(ROUND(AVG(r.`Rating`), 2), 0.00) AS Avg_Rating
FROM `Services` s
LEFT JOIN `Reviews` r ON s.`S-ID` = r.`S-ID`
GROUP BY s.`S-ID`, s.`Name`, s.`Category`
ORDER BY Review_Count DESC;

-- 6.3 RIGHT JOIN: All Bookings and any matching Payment record (shows unpaid Pending Booking #8 with NULL payment)
SELECT
    p.`P-ID`,
    p.`Amt`,
    p.`Method`,
    b.`B-ID`,
    b.`Status`,
    b.`Check_In`,
    b.`Check_Out`
FROM `Payment` p
RIGHT JOIN `Bookings` b ON p.`B-ID` = b.`B-ID`
ORDER BY b.`B-ID`;


-- ============================================================================
-- SECTION 7: Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)
-- ============================================================================

SELECT
    COUNT(`S-ID`)            AS Total_Catalog_Offerings,
    MIN(`Price`)             AS Lowest_Offering_Price,
    MAX(`Price`)             AS Highest_Offering_Price,
    ROUND(AVG(`Price`), 2)   AS Average_Offering_Price,
    SUM(`Total_Units`)       AS Total_Inventory_Units
FROM `Services`;

SELECT
    COUNT(`P-ID`)            AS Total_Payments_Count,
    SUM(`Amt`)               AS Gross_Payment_Volume,
    ROUND(AVG(`Amt`), 2)     AS Average_Transaction_Amt,
    MIN(`Amt`)               AS Smallest_Payment,
    MAX(`Amt`)               AS Largest_Payment
FROM `Payment`;


-- ============================================================================
-- SECTION 8: GROUP BY and HAVING
-- ============================================================================

-- Find hotel locations whose total gross revenue across bookings exceeds INR 40,000
SELECT
    l.`L-ID`,
    l.`Name` AS Hotel_Location,
    l.`City`,
    COUNT(DISTINCT b.`B-ID`) AS Total_Bookings,
    COALESCE(SUM(p.`Amt`), 0.00) AS Gross_Revenue
FROM `Location` l
INNER JOIN `Services` s ON l.`L-ID` = s.`L-ID`
INNER JOIN `Bookings` b ON s.`S-ID` = b.`S-ID`
INNER JOIN `Payment` p  ON b.`B-ID` = p.`B-ID`
GROUP BY l.`L-ID`, l.`Name`, l.`City`
HAVING SUM(p.`Amt`) > 40000.00
ORDER BY Gross_Revenue DESC;


-- ============================================================================
-- SECTION 9: Subqueries (Scalar, IN, NOT EXISTS, Correlated)
-- ============================================================================

-- 9.1 Scalar Subquery: Rooms priced higher than the average price of all rooms
SELECT
    `S-ID`,
    `Name`,
    `Price`
FROM `Services`
WHERE `Category` = 'Room'
  AND `Price` > (
      SELECT AVG(`Price`) FROM `Services` WHERE `Category` = 'Room'
  );

-- 9.2 NOT EXISTS Subquery: Guests who have never cancelled any booking
SELECT
    u.`U-ID`,
    u.`Name`,
    u.`Email`
FROM `User` u
WHERE NOT EXISTS (
    SELECT 1
    FROM `Bookings` b
    INNER JOIN `Cancellation` c ON b.`B-ID` = c.`B-ID`
    WHERE b.`U-ID` = u.`U-ID`
);

-- 9.3 Correlated Subquery: Offerings priced above the average price at their own Location (L-ID)
SELECT
    s1.`S-ID`,
    s1.`Name`,
    s1.`L-ID`,
    s1.`Price`
FROM `Services` s1
WHERE s1.`Price` > (
    SELECT AVG(s2.`Price`)
    FROM `Services` s2
    WHERE s2.`L-ID` = s1.`L-ID`
);


-- ============================================================================
-- SECTION 10: Views (CREATE OR REPLACE VIEW)
-- ============================================================================

-- 10.1 View 1: Comprehensive Booking & Financial Summary View
CREATE OR REPLACE VIEW `vw_booking_financial_summary` AS
SELECT
    b.`B-ID`        AS Booking_ID,
    u.`U-ID`        AS User_ID,
    u.`Name`        AS Guest_Name,
    u.`Email`       AS Guest_Email,
    l.`L-ID`        AS Location_ID,
    l.`Name`        AS Hotel_Location,
    l.`City`        AS City,
    s.`S-ID`        AS Service_ID,
    s.`Name`        AS Service_Name,
    s.`Category`    AS Category,
    b.`Check_In`,
    b.`Check_Out`,
    DATEDIFF(b.`Check_Out`, b.`Check_In`) AS Nights,
    b.`Guests`,
    b.`Status`      AS Booking_Status,
    COALESCE(p.`Amt`, 0.00)        AS Paid_Amt,
    p.`Method`                     AS Payment_Method,
    i.`I-ID`                       AS Invoice_ID,
    COALESCE(c.`Refund-amt`, 0.00) AS Refund_Amt,
    (COALESCE(p.`Amt`, 0.00) - COALESCE(c.`Refund-amt`, 0.00)) AS Net_Retained_Amt
FROM `Bookings` b
INNER JOIN `User` u     ON b.`U-ID` = u.`U-ID`
INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
LEFT JOIN  `Payment` p  ON b.`B-ID` = p.`B-ID`
LEFT JOIN  `Invoices` i ON b.`B-ID` = i.`B-ID`
LEFT JOIN  `Cancellation` c ON b.`B-ID` = c.`B-ID`;

-- Query View 1
SELECT * FROM `vw_booking_financial_summary` ORDER BY Booking_ID;

-- 10.2 View 2: Hotel Location Inventory & Rating Overview
CREATE OR REPLACE VIEW `vw_location_occupancy_overview` AS
SELECT
    l.`L-ID` AS Location_ID,
    l.`Name` AS Hotel_Name,
    l.`City`,
    COUNT(DISTINCT s.`S-ID`) AS Total_Offerings,
    SUM(CASE WHEN s.`Category` = 'Room' THEN s.`Total_Units` ELSE 0 END) AS Total_Room_Inventory,
    COUNT(DISTINCT CASE WHEN b.`Status` IN ('Pending', 'Confirmed') THEN b.`B-ID` END) AS Active_Reservations,
    COUNT(DISTINCT CASE WHEN b.`Status` = 'Cancelled' THEN b.`B-ID` END) AS Cancelled_Reservations,
    ROUND(AVG(r.`Rating`), 2) AS Average_Guest_Rating
FROM `Location` l
LEFT JOIN `Services` s ON l.`L-ID` = s.`L-ID`
LEFT JOIN `Bookings` b ON s.`S-ID` = b.`S-ID`
LEFT JOIN `Reviews` r  ON s.`S-ID` = r.`S-ID`
GROUP BY l.`L-ID`, l.`Name`, l.`City`;

-- Query View 2
SELECT * FROM `vw_location_occupancy_overview`;


-- ============================================================================
-- SECTION 11: Stored Procedures
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_check_service_availability`;

DELIMITER //
CREATE PROCEDURE `sp_check_service_availability`(
    IN p_s_id INT,
    IN p_check_in DATE,
    IN p_check_out DATE,
    IN p_guests INT
)
BEGIN
    SELECT
        s.`S-ID` AS Service_ID,
        s.`Name` AS Service_Name,
        s.`Category`,
        s.`Price` AS Unit_Price,
        DATEDIFF(p_check_out, p_check_in) AS Requested_Nights,
        s.`Max_Guests`,
        s.`Total_Units`,
        COUNT(b.`B-ID`) AS Active_Overlapping_Bookings,
        (s.`Total_Units` - COUNT(b.`B-ID`)) AS Available_Units,
        CASE
            WHEN p_check_out <= p_check_in THEN 'INVALID_DATE_RANGE'
            WHEN p_guests > s.`Max_Guests` THEN 'EXCEEDS_MAX_GUESTS'
            WHEN (s.`Total_Units` - COUNT(b.`B-ID`)) > 0 THEN 'AVAILABLE'
            ELSE 'SOLD_OUT'
        END AS Availability_Result,
        CASE
            WHEN s.`Category` = 'Room' THEN s.`Price` * DATEDIFF(p_check_out, p_check_in)
            ELSE s.`Price`
        END AS Estimated_Total_INR
    FROM `Services` s
    LEFT JOIN `Bookings` b
        ON s.`S-ID` = b.`S-ID`
        AND b.`Status` IN ('Pending', 'Confirmed')
        AND b.`Check_In` < p_check_out
        AND b.`Check_Out` > p_check_in
    WHERE s.`S-ID` = p_s_id
    GROUP BY s.`S-ID`, s.`Name`, s.`Category`, s.`Price`, s.`Max_Guests`, s.`Total_Units`;
END //
DELIMITER ;

-- Execute the Stored Procedure for S-ID = 1 (Royal Lakeview Suite)
CALL `sp_check_service_availability`(1, '2026-11-20', '2026-11-23', 2);


-- ============================================================================
-- SECTION 12: Triggers
-- Automatically logs any status transition on `Bookings` into `Booking_Status_Audit`
-- ============================================================================

DROP TRIGGER IF EXISTS `trg_after_booking_status_update`;

DELIMITER //
CREATE TRIGGER `trg_after_booking_status_update`
AFTER UPDATE ON `Bookings`
FOR EACH ROW
BEGIN
    IF OLD.`Status` <> NEW.`Status` THEN
        INSERT INTO `Booking_Status_Audit` (`B-ID`, `Old_Status`, `New_Status`, `Changed_At`)
        VALUES (NEW.`B-ID`, OLD.`Status`, NEW.`Status`, NOW());
    END IF;
END //
DELIMITER ;

-- Trigger Demonstration: Temporarily update Booking #8 from 'Pending' to 'Confirmed' and back
UPDATE `Bookings` SET `Status` = 'Confirmed' WHERE `B-ID` = 8;
UPDATE `Bookings` SET `Status` = 'Pending'   WHERE `B-ID` = 8;

-- View the audit rows automatically captured by the trigger
SELECT * FROM `Booking_Status_Audit`;


-- ============================================================================
-- SECTION 13: Transactions (START TRANSACTION, COMMIT, ROLLBACK) & ACID Demo
-- ============================================================================

-- 13.1 ROLLBACK Demonstration: Insert a temporary booking, verify it inside the
--      transaction, and ROLLBACK so no permanent change is left in the table.
START TRANSACTION;

INSERT INTO `Bookings` (`B-ID`, `U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`)
VALUES (950, 1, 2, '2026-12-24', '2026-12-27', 2, 'Pending');

-- Inside the transaction, Booking #950 is visible:
SELECT * FROM `Bookings` WHERE `B-ID` = 950;

-- Undo the uncommitted transaction:
ROLLBACK;

-- After ROLLBACK, Booking #950 does not exist (0 rows returned):
SELECT * FROM `Bookings` WHERE `B-ID` = 950;


-- ============================================================================
-- SECTION 14: Indexes and EXPLAIN Query Execution Plan
-- ============================================================================

-- 14.1 Inspect indexes on `Bookings` (including composite index `idx_bookings_availability`)
SHOW INDEX FROM `Bookings`;

-- 14.2 EXPLAIN the date-overlap availability check to verify index utilization
EXPLAIN
SELECT COUNT(`B-ID`) AS Overlapping_Active_Bookings
FROM `Bookings`
WHERE `S-ID` = 4
  AND `Status` IN ('Pending', 'Confirmed')
  AND `Check_In` < '2026-11-18'
  AND `Check_Out` > '2026-11-15';
