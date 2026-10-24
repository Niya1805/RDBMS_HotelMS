-- ============================================================================
-- Hotel Reservation System — MySQL 8 Database Schema (schema.sql)
-- Derived from Diagram1.dia and approved analysis in docs/erd_analysis.md
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hotel_reservation_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_reservation_db;

-- Drop existing tables in reverse dependency order for clean re-execution
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `Notification`;
DROP TABLE IF EXISTS `Reviews`;
DROP TABLE IF EXISTS `Invoices`;
DROP TABLE IF EXISTS `Cancellation`;
DROP TABLE IF EXISTS `Payment`;
DROP TABLE IF EXISTS `Bookings`;
DROP TABLE IF EXISTS `Services`;
DROP TABLE IF EXISTS `Location`;
DROP TABLE IF EXISTS `User`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. User (Original Diagram1.dia Entity: O0)
-- Original Attributes: U-ID, Name, Phone, Email
-- ============================================================================
CREATE TABLE `User` (
    `U-ID`  INT AUTO_INCREMENT,
    `Name`  VARCHAR(100) NOT NULL,
    `Phone` VARCHAR(20)  NOT NULL,
    `Email` VARCHAR(150) NOT NULL,
    CONSTRAINT pk_user PRIMARY KEY (`U-ID`),
    CONSTRAINT uq_user_phone UNIQUE (`Phone`),
    CONSTRAINT uq_user_email UNIQUE (`Email`),
    CONSTRAINT chk_user_name CHECK (CHAR_LENGTH(TRIM(`Name`)) >= 2),
    CONSTRAINT chk_user_email CHECK (`Email` LIKE '%_@_%._%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. Location (Original Diagram1.dia Entity: O5)
-- Original Attributes: L-ID, Name, Address, City, Country
-- ============================================================================
CREATE TABLE `Location` (
    `L-ID`    INT AUTO_INCREMENT,
    `Name`    VARCHAR(120) NOT NULL,
    `Address` VARCHAR(255) NOT NULL,
    `City`    VARCHAR(80)  NOT NULL,
    `Country` VARCHAR(80)  NOT NULL DEFAULT 'India',
    CONSTRAINT pk_location PRIMARY KEY (`L-ID`),
    CONSTRAINT chk_location_name CHECK (CHAR_LENGTH(TRIM(`Name`)) >= 2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_location_city_country ON `Location` (`City`, `Country`);

-- ============================================================================
-- 3. Services (Original Diagram1.dia Entity: O4)
-- Original Attributes: S-ID, Name, Price, Description
-- Approved Additions (docs/erd_analysis.md):
--   - L-ID (FK to Location for the 'Services — has — Location' diamond O80)
--   - Category ('Room' vs 'Add-On' to support both bookable rooms and services)
--   - Max_Guests (guest capacity per unit)
--   - Total_Units (room/service inventory count for overlap & availability checks)
-- ============================================================================
CREATE TABLE `Services` (
    `S-ID`        INT AUTO_INCREMENT,
    `Name`        VARCHAR(120)   NOT NULL,
    `Price`       DECIMAL(10, 2) NOT NULL,
    `Description` TEXT           NOT NULL,
    `L-ID`        INT            NOT NULL,
    `Category`    ENUM('Room', 'Add-On') NOT NULL DEFAULT 'Room',
    `Max_Guests`  INT            NOT NULL DEFAULT 2,
    `Total_Units` INT            NOT NULL DEFAULT 1,
    CONSTRAINT pk_services PRIMARY KEY (`S-ID`),
    CONSTRAINT fk_services_location FOREIGN KEY (`L-ID`)
        REFERENCES `Location` (`L-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_services_price CHECK (`Price` > 0.00),
    CONSTRAINT chk_services_max_guests CHECK (`Max_Guests` >= 1),
    CONSTRAINT chk_services_total_units CHECK (`Total_Units` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_services_location_category ON `Services` (`L-ID`, `Category`);
CREATE INDEX idx_services_price ON `Services` (`Price`);

-- ============================================================================
-- 4. Bookings (Original Diagram1.dia Entity: O3)
-- Note: In Diagram1.dia, Bookings had zero attribute ellipses attached, though
--       B-ID was referenced by Payment, Cancellation, and Invoices.
-- Approved Minimal Attributes (docs/erd_analysis.md):
--   B-ID (PK), U-ID (FK), S-ID (FK), Check_In, Check_Out, Guests, Status
-- ============================================================================
CREATE TABLE `Bookings` (
    `B-ID`      INT AUTO_INCREMENT,
    `U-ID`      INT  NOT NULL,
    `S-ID`      INT  NOT NULL,
    `Check_In`  DATE NOT NULL,
    `Check_Out` DATE NOT NULL,
    `Guests`    INT  NOT NULL DEFAULT 1,
    `Status`    ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') NOT NULL DEFAULT 'Pending',
    CONSTRAINT pk_bookings PRIMARY KEY (`B-ID`),
    CONSTRAINT fk_bookings_user FOREIGN KEY (`U-ID`)
        REFERENCES `User` (`U-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_bookings_service FOREIGN KEY (`S-ID`)
        REFERENCES `Services` (`S-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_bookings_dates CHECK (`Check_Out` > `Check_In`),
    CONSTRAINT chk_bookings_guests CHECK (`Guests` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite index optimized for date-range overlap & room availability queries
CREATE INDEX idx_bookings_availability ON `Bookings` (`S-ID`, `Status`, `Check_In`, `Check_Out`);
CREATE INDEX idx_bookings_user ON `Bookings` (`U-ID`, `Check_In`);

-- ============================================================================
-- 5. Payment (Original Diagram1.dia Entity: O6)
-- Original Attributes: P-ID, Amt, B-ID, Date, Method
-- Note: User is resolved via Bookings.U-ID in 3NF.
-- ============================================================================
CREATE TABLE `Payment` (
    `P-ID`   INT AUTO_INCREMENT,
    `B-ID`   INT            NOT NULL,
    `Amt`    DECIMAL(10, 2) NOT NULL,
    `Date`   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Method` ENUM('Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Cash') NOT NULL,
    CONSTRAINT pk_payment PRIMARY KEY (`P-ID`),
    CONSTRAINT fk_payment_booking FOREIGN KEY (`B-ID`)
        REFERENCES `Bookings` (`B-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_payment_amt CHECK (`Amt` > 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payment_booking ON `Payment` (`B-ID`);
CREATE INDEX idx_payment_date ON `Payment` (`Date`);

-- ============================================================================
-- 6. Cancellation (Original Diagram1.dia Entity: O2)
-- Original Attributes: C-ID, B-ID, Date, Refund-amt
-- ============================================================================
CREATE TABLE `Cancellation` (
    `C-ID`       INT AUTO_INCREMENT,
    `B-ID`       INT            NOT NULL,
    `Date`       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Refund-amt` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT pk_cancellation PRIMARY KEY (`C-ID`),
    CONSTRAINT uq_cancellation_booking UNIQUE (`B-ID`),
    CONSTRAINT fk_cancellation_booking FOREIGN KEY (`B-ID`)
        REFERENCES `Bookings` (`B-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_cancellation_refund CHECK (`Refund-amt` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. Invoices (Original Diagram1.dia Entity: O8)
-- Original Attributes: I-ID, U-ID, B-ID, Amt, Date
-- ============================================================================
CREATE TABLE `Invoices` (
    `I-ID` INT AUTO_INCREMENT,
    `U-ID` INT            NOT NULL,
    `B-ID` INT            NOT NULL,
    `Amt`  DECIMAL(10, 2) NOT NULL,
    `Date` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_invoices PRIMARY KEY (`I-ID`),
    CONSTRAINT uq_invoices_booking UNIQUE (`B-ID`),
    CONSTRAINT fk_invoices_user FOREIGN KEY (`U-ID`)
        REFERENCES `User` (`U-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_invoices_booking FOREIGN KEY (`B-ID`)
        REFERENCES `Bookings` (`B-ID`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_invoices_amt CHECK (`Amt` >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invoices_user ON `Invoices` (`U-ID`);

-- ============================================================================
-- 8. Reviews (Original Diagram1.dia Entity: O7)
-- Original Attributes: R-ID, U-ID, S-ID, Rating, Comment
-- ============================================================================
CREATE TABLE `Reviews` (
    `R-ID`    INT AUTO_INCREMENT,
    `U-ID`    INT  NOT NULL,
    `S-ID`    INT  NOT NULL,
    `Rating`  INT  NOT NULL,
    `Comment` TEXT NOT NULL,
    CONSTRAINT pk_reviews PRIMARY KEY (`R-ID`),
    CONSTRAINT fk_reviews_user FOREIGN KEY (`U-ID`)
        REFERENCES `User` (`U-ID`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_reviews_service FOREIGN KEY (`S-ID`)
        REFERENCES `Services` (`S-ID`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_reviews_rating CHECK (`Rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reviews_service_rating ON `Reviews` (`S-ID`, `Rating`);
CREATE INDEX idx_reviews_user ON `Reviews` (`U-ID`);

-- ============================================================================
-- 9. Notification (Original Diagram1.dia Entity: O1)
-- Original Attributes: N-ID, U-ID, Message
-- ============================================================================
CREATE TABLE `Notification` (
    `N-ID`    INT AUTO_INCREMENT,
    `U-ID`    INT          NOT NULL,
    `Message` VARCHAR(500) NOT NULL,
    CONSTRAINT pk_notification PRIMARY KEY (`N-ID`),
    CONSTRAINT fk_notification_user FOREIGN KEY (`U-ID`)
        REFERENCES `User` (`U-ID`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_notification_message CHECK (CHAR_LENGTH(TRIM(`Message`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_notification_user ON `Notification` (`U-ID`);
