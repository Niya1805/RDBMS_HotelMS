-- ============================================================================
-- Hotel Reservation System — Schema & Relationship Verification (verification.sql)
-- Run this script after executing schema.sql and seed.sql
-- ============================================================================

USE hotel_reservation_db;

-- ----------------------------------------------------------------------------
-- 1. Verify Row Counts Across All 9 Original ER Entities
-- ----------------------------------------------------------------------------
SELECT 'User' AS Entity_Name, COUNT(*) AS Record_Count FROM `User`
UNION ALL
SELECT 'Location',     COUNT(*) FROM `Location`
UNION ALL
SELECT 'Services',     COUNT(*) FROM `Services`
UNION ALL
SELECT 'Bookings',     COUNT(*) FROM `Bookings`
UNION ALL
SELECT 'Payment',      COUNT(*) FROM `Payment`
UNION ALL
SELECT 'Cancellation', COUNT(*) FROM `Cancellation`
UNION ALL
SELECT 'Invoices',     COUNT(*) FROM `Invoices`
UNION ALL
SELECT 'Reviews',      COUNT(*) FROM `Reviews`
UNION ALL
SELECT 'Notification', COUNT(*) FROM `Notification`;

-- ----------------------------------------------------------------------------
-- 2. Verify Multi-Table Relationships (User -> Bookings -> Services -> Location -> Payment -> Invoices)
--    Also demonstrates 3NF resolution of 'User — makes — Payment' via Bookings
-- ----------------------------------------------------------------------------
SELECT
    b.`B-ID`        AS Booking_ID,
    u.`Name`        AS Guest_Name,
    u.`Email`       AS Guest_Email,
    l.`Name`        AS Hotel_Location,
    l.`City`        AS City,
    s.`Name`        AS Booked_Service,
    s.`Category`    AS Service_Category,
    b.`Check_In`,
    b.`Check_Out`,
    DATEDIFF(b.`Check_Out`, b.`Check_In`) AS Nights,
    b.`Guests`,
    b.`Status`      AS Booking_Status,
    p.`P-ID`        AS Payment_ID,
    p.`Amt`         AS Paid_Amount,
    p.`Method`      AS Payment_Method,
    i.`I-ID`        AS Invoice_ID
FROM `Bookings` b
INNER JOIN `User` u     ON b.`U-ID` = u.`U-ID`
INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
LEFT JOIN  `Payment` p  ON b.`B-ID` = p.`B-ID`
LEFT JOIN  `Invoices` i ON b.`B-ID` = i.`B-ID`
ORDER BY b.`B-ID`;

-- ----------------------------------------------------------------------------
-- 3. Verify Cancellation Relationship & Refund Tracking (Bookings <-> Cancellation)
-- ----------------------------------------------------------------------------
SELECT
    c.`C-ID`        AS Cancellation_ID,
    b.`B-ID`        AS Booking_ID,
    u.`Name`        AS Guest_Name,
    s.`Name`        AS Cancelled_Room_Or_Service,
    b.`Status`      AS Current_Booking_Status,
    p.`Amt`         AS Original_Payment_Amt,
    c.`Refund-amt`  AS Refunded_Amt,
    c.`Date`        AS Cancellation_Timestamp
FROM `Cancellation` c
INNER JOIN `Bookings` b ON c.`B-ID` = b.`B-ID`
INNER JOIN `User` u     ON b.`U-ID` = u.`U-ID`
INNER JOIN `Services` s ON b.`S-ID` = s.`S-ID`
LEFT JOIN  `Payment` p  ON b.`B-ID` = p.`B-ID`;

-- ----------------------------------------------------------------------------
-- 4. Verify Room Availability & Overlap Prevention Logic
--    Testing Date Range: '2026-11-15' to '2026-11-18'
--    Note: S-ID = 4 (Oceanfront Pool Villa, Total_Units = 1) has TWO bookings
--    for '2026-11-15' to '2026-11-18':
--      - Booking #4 (Status = 'Cancelled') -> Excluded from active overlaps!
--      - Booking #5 (Status = 'Confirmed') -> Counted as 1 active overlap.
-- ----------------------------------------------------------------------------
SET @req_check_in  = '2026-11-15';
SET @req_check_out = '2026-11-18';

SELECT
    s.`S-ID`,
    l.`City`,
    l.`Name` AS Hotel_Name,
    s.`Name` AS Room_Or_Service_Name,
    s.`Category`,
    s.`Price` AS Nightly_Or_Unit_Price,
    s.`Max_Guests`,
    s.`Total_Units`,
    COUNT(b.`B-ID`) AS Active_Overlapping_Bookings,
    (s.`Total_Units` - COUNT(b.`B-ID`)) AS Available_Units,
    CASE
        WHEN (s.`Total_Units` - COUNT(b.`B-ID`)) > 0 THEN 'AVAILABLE'
        ELSE 'SOLD OUT'
    END AS Availability_Status
FROM `Services` s
INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
LEFT JOIN `Bookings` b
    ON s.`S-ID` = b.`S-ID`
    AND b.`Status` IN ('Pending', 'Confirmed')
    AND b.`Check_In`  < @req_check_out
    AND b.`Check_Out` > @req_check_in
GROUP BY
    s.`S-ID`, l.`City`, l.`Name`, s.`Name`, s.`Category`, s.`Price`, s.`Max_Guests`, s.`Total_Units`
ORDER BY s.`S-ID`;

-- ----------------------------------------------------------------------------
-- 5. Verify Reviews & Ratings Aggregation (User -> Reviews -> Services)
-- ----------------------------------------------------------------------------
SELECT
    s.`S-ID`,
    s.`Name` AS Service_Name,
    s.`Category`,
    l.`City`,
    COUNT(r.`R-ID`) AS Total_Reviews,
    ROUND(AVG(r.`Rating`), 2) AS Average_Rating
FROM `Services` s
INNER JOIN `Location` l ON s.`L-ID` = l.`L-ID`
LEFT JOIN  `Reviews` r  ON s.`S-ID` = r.`S-ID`
GROUP BY s.`S-ID`, s.`Name`, s.`Category`, l.`City`
ORDER BY Average_Rating DESC;

-- ----------------------------------------------------------------------------
-- 6. Verify User Notifications (User -> Notification)
-- ----------------------------------------------------------------------------
SELECT
    n.`N-ID`,
    u.`U-ID`,
    u.`Name` AS Recipient_Name,
    n.`Message`
FROM `Notification` n
INNER JOIN `User` u ON n.`U-ID` = u.`U-ID`
ORDER BY n.`N-ID`;
