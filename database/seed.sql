-- ============================================================================
-- Hotel Reservation System — Sample Seed Data (seed.sql)
-- Entirely fictional demonstration records for all 9 ER entities
-- ============================================================================

USE hotel_reservation_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `Notification`;
TRUNCATE TABLE `Reviews`;
TRUNCATE TABLE `Invoices`;
TRUNCATE TABLE `Cancellation`;
TRUNCATE TABLE `Payment`;
TRUNCATE TABLE `Bookings`;
TRUNCATE TABLE `Services`;
TRUNCATE TABLE `Location`;
TRUNCATE TABLE `User`;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 1. User (Fictional guests — no real PII)
-- ============================================================================
INSERT INTO `User` (`U-ID`, `Name`, `Phone`, `Email`) VALUES
(1, 'Aarav Mehta',      '+91-90000-10001', 'aarav.mehta@example.com'),
(2, 'Diya Sharma',      '+91-90000-10002', 'diya.sharma@example.com'),
(3, 'Rohan Verma',      '+91-90000-10003', 'rohan.verma@example.com'),
(4, 'Meera Nair',       '+91-90000-10004', 'meera.nair@example.com'),
(5, 'Kabir Sengupta',   '+91-90000-10005', 'kabir.sengupta@example.com'),
(6, 'Ananya Kulkarni',  '+91-90000-10006', 'ananya.kulkarni@example.com');

-- ============================================================================
-- 2. Location (Fictional Grand Aurelia hotel properties)
-- ============================================================================
INSERT INTO `Location` (`L-ID`, `Name`, `Address`, `City`, `Country`) VALUES
(1, 'Grand Aurelia Palace Udaipur',   '14 Lake Pichola Promenade, Heritage Quarter', 'Udaipur',   'India'),
(2, 'Grand Aurelia Bay Resort Goa',   '88 Cavelossim Coastal Drive, South Goa',      'Margao',    'India'),
(3, 'Grand Aurelia Residences Mumbai','210 Marine Drive, Nariman Point',             'Mumbai',    'India'),
(4, 'Grand Aurelia Alpine Retreat',   '42 Mall Road Crest, Old Manali',              'Manali',    'India');

-- ============================================================================
-- 3. Services (Both bookable hotel rooms/suites AND optional add-on services)
-- ============================================================================
INSERT INTO `Services` (`S-ID`, `Name`, `Price`, `Description`, `L-ID`, `Category`, `Max_Guests`, `Total_Units`) VALUES
-- Udaipur (L-ID = 1)
(1,  'Royal Lakeview Suite',          14500.00, 'Panoramic Lake Pichola views, private marble balcony, king four-poster bed, and butler service.', 1, 'Room',   3, 2),
(2,  'Heritage Courtyard Deluxe Room', 8500.00, 'Traditional Rajasthani arches, handcrafted teak furniture, rain shower, and courtyard access.',  1, 'Room',   2, 4),
(3,  'Sunset Boat Transfer & Dinner',  3200.00, 'Private evening boat cruise on Lake Pichola followed by a 4-course candlelight dinner.',         1, 'Add-On', 2, 5),

-- Goa (L-ID = 2)
(4,  'Oceanfront Pool Villa',         18000.00, 'Direct beach access, private infinity plunge pool, outdoor sundeck, and king bedroom.',          2, 'Room',   4, 1),
(5,  'Tropical Garden Twin Room',      7200.00, 'Lush palm garden views, twin plush beds, workspace, and complimentary beach lounge access.',     2, 'Room',   2, 5),
(6,  'Ayurvedic Wellness Spa Package', 2500.00, '90-minute holistic aromatherapy and deep-tissue rejuvenation session at the resort spa.',        2, 'Add-On', 2, 8),

-- Mumbai (L-ID = 3)
(7,  'Executive Sea-Facing Club Room',11000.00, 'High-floor Arabian Sea view, executive lounge access, ergonomic workstation, and king bed.',     3, 'Room',   2, 3),
(8,  'Chauffeur Airport Transfer',     1800.00, 'Private luxury sedan pickup and drop-off to Chhatrapati Shivaji Maharaj International Airport.', 3, 'Add-On', 3, 6),

-- Manali (L-ID = 4)
(9,  'Himalayan Cedar Chalet',        12500.00, 'Heated wood-paneled duplex chalet with wood-burning fireplace and snow-peak views.',             4, 'Room',   4, 2),
(10, 'Guided Solang Valley Excursion', 2800.00, 'Full-day private SUV excursion with mountain picnic and adventure gear.',                        4, 'Add-On', 4, 4);

-- ============================================================================
-- 4. Bookings (Demonstrating Completed, Confirmed, Cancelled, and Pending)
-- Notice Bookings #4 and #5 share overlapping dates (2026-11-15 to 2026-11-18)
-- on S-ID = 4 (Oceanfront Pool Villa, Total_Units = 1). Because Booking #4 is
-- 'Cancelled', Booking #5 is allowed and 'Confirmed' without conflict!
-- ============================================================================
INSERT INTO `Bookings` (`B-ID`, `U-ID`, `S-ID`, `Check_In`, `Check_Out`, `Guests`, `Status`) VALUES
(1, 1, 1, '2026-10-05', '2026-10-08', 2, 'Completed'),
(2, 2, 2, '2026-10-10', '2026-10-12', 2, 'Completed'),
(3, 3, 7, '2026-11-01', '2026-11-04', 1, 'Confirmed'),
(4, 4, 4, '2026-11-15', '2026-11-18', 2, 'Cancelled'),
(5, 5, 4, '2026-11-15', '2026-11-18', 3, 'Confirmed'),
(6, 6, 9, '2026-12-01', '2026-12-05', 4, 'Confirmed'),
(7, 1, 3, '2026-10-06', '2026-10-07', 2, 'Completed'),
(8, 2, 5, '2026-12-10', '2026-12-13', 2, 'Pending');

-- ============================================================================
-- 5. Payment (Linked to Bookings via B-ID)
-- ============================================================================
INSERT INTO `Payment` (`P-ID`, `B-ID`, `Amt`, `Date`, `Method`) VALUES
(1, 1, 43500.00, '2026-10-01 10:15:00', 'Credit Card'),
(2, 2, 17000.00, '2026-10-08 14:30:00', 'UPI'),
(3, 3, 33000.00, '2026-10-20 09:45:00', 'Net Banking'),
(4, 4, 54000.00, '2026-10-18 11:20:00', 'Credit Card'),
(5, 5, 54000.00, '2026-10-22 16:10:00', 'Debit Card'),
(6, 6, 50000.00, '2026-10-23 18:05:00', 'UPI'),
(7, 7,  3200.00, '2026-10-05 19:00:00', 'Cash');

-- ============================================================================
-- 6. Cancellation (Linked to Cancelled Booking #4)
-- ============================================================================
INSERT INTO `Cancellation` (`C-ID`, `B-ID`, `Date`, `Refund-amt`) VALUES
(1, 4, '2026-10-21 12:00:00', 48600.00);

-- ============================================================================
-- 7. Invoices (Linked to User U-ID and Bookings B-ID)
-- ============================================================================
INSERT INTO `Invoices` (`I-ID`, `U-ID`, `B-ID`, `Amt`, `Date`) VALUES
(1, 1, 1, 43500.00, '2026-10-08 11:00:00'),
(2, 2, 2, 17000.00, '2026-10-12 10:30:00'),
(3, 3, 3, 33000.00, '2026-10-20 09:46:00'),
(4, 4, 4, 54000.00, '2026-10-18 11:21:00'),
(5, 5, 5, 54000.00, '2026-10-22 16:11:00'),
(6, 6, 6, 50000.00, '2026-10-23 18:06:00'),
(7, 1, 7,  3200.00, '2026-10-07 09:00:00');

-- ============================================================================
-- 8. Reviews (Linked to User U-ID and Services S-ID)
-- ============================================================================
INSERT INTO `Reviews` (`R-ID`, `U-ID`, `S-ID`, `Rating`, `Comment`) VALUES
(1, 1, 1, 5, 'Unforgettable stay overlooking Lake Pichola. The Royal Lakeview Suite was spotless and spacious.'),
(2, 1, 3, 5, 'The sunset boat cruise and dinner was the highlight of our Udaipur trip!'),
(3, 2, 2, 4, 'Beautiful heritage courtyard ambiance and very courteous staff.'),
(4, 3, 7, 5, 'Great sea view from the Executive Club Room and fast check-in experience.'),
(5, 5, 4, 5, 'The private plunge pool and direct beach access in South Goa exceeded expectations.');

-- ============================================================================
-- 9. Notification (Linked to User U-ID)
-- ============================================================================
INSERT INTO `Notification` (`N-ID`, `U-ID`, `Message`) VALUES
(1, 1, 'Your reservation #1 for Royal Lakeview Suite (Udaipur) is completed. Thank you for staying with us!'),
(2, 2, 'Your invoice #2 for Heritage Courtyard Deluxe Room is ready for download.'),
(3, 3, 'Booking #3 confirmed: Executive Sea-Facing Club Room (Mumbai) from 2026-11-01 to 2026-11-04.'),
(4, 4, 'Booking #4 has been cancelled. A refund of INR 48,600.00 has been initiated.'),
(5, 5, 'Booking #5 confirmed: Oceanfront Pool Villa (Goa) from 2026-11-15 to 2026-11-18.'),
(6, 6, 'Booking #6 confirmed: Himalayan Cedar Chalet (Manali) from 2026-12-01 to 2026-12-05.'),
(7, 2, 'Payment pending for Booking #8 (Tropical Garden Twin Room, Goa). Complete payment to confirm.');
