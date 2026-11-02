-- City Safar: MySQL 8.0+ schema (eleven application tables)
CREATE DATABASE IF NOT EXISTS city_safar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE city_safar;

CREATE TABLE IF NOT EXISTS users (
 user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL UNIQUE,
 phone VARCHAR(20) DEFAULT NULL, password VARCHAR(255) NOT NULL,
 role ENUM('admin','passenger','driver') NOT NULL DEFAULT 'passenger',
 status ENUM('active','blocked') NOT NULL DEFAULT 'active',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS buses (
 bus_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 bus_number VARCHAR(30) NOT NULL UNIQUE,
 registration_number VARCHAR(30) NOT NULL UNIQUE,
 bus_type ENUM('AC','Non-AC') NOT NULL,
 total_seats INT UNSIGNED NOT NULL,
 status ENUM('available','maintenance') NOT NULL DEFAULT 'available',
 CHECK (total_seats BETWEEN 4 AND 80)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS drivers (
 driver_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL UNIQUE,
 license_number VARCHAR(50) NOT NULL UNIQUE,
 address VARCHAR(255) DEFAULT NULL, joining_date DATE NOT NULL,
 CONSTRAINT fk_drivers_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS routes (
 route_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 route_name VARCHAR(100) NOT NULL,
 source VARCHAR(100) NOT NULL, destination VARCHAR(100) NOT NULL,
 distance_km DECIMAL(8,2) NOT NULL,
 estimated_minutes INT UNSIGNED NOT NULL,
 fare_per_km DECIMAL(8,2) NOT NULL,
 status ENUM('active','inactive') NOT NULL DEFAULT 'active',
 CHECK (distance_km > 0), CHECK (fare_per_km > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stops (
 stop_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 stop_name VARCHAR(100) NOT NULL,
 city VARCHAR(100) NOT NULL,
 address VARCHAR(255) DEFAULT NULL,
 UNIQUE KEY uq_stop_city_name (city, stop_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS route_stops (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 route_id INT UNSIGNED NOT NULL,
 stop_id INT UNSIGNED NOT NULL,
 stop_order INT UNSIGNED NOT NULL,
 distance_from_start_km DECIMAL(8,2) NOT NULL,
 UNIQUE KEY uq_route_stop (route_id, stop_id),
 UNIQUE KEY uq_route_order (route_id, stop_order),
 FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
 FOREIGN KEY (stop_id) REFERENCES stops(stop_id) ON DELETE RESTRICT,
 CHECK (distance_from_start_km >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
 schedule_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 bus_id INT UNSIGNED NOT NULL, route_id INT UNSIGNED NOT NULL, driver_id INT UNSIGNED NOT NULL,
 departure_time DATETIME NOT NULL, arrival_time DATETIME NOT NULL,
 fare_override DECIMAL(10,2) DEFAULT NULL COMMENT 'Full-route fare; partial fares scaled by distance',
 status ENUM('scheduled','delayed','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
 FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE RESTRICT,
 FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE RESTRICT,
 FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE RESTRICT,
 INDEX ix_schedule_departure (departure_time, status),
 CHECK (arrival_time > departure_time)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
 booking_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 booking_reference VARCHAR(30) NOT NULL UNIQUE,
 user_id INT UNSIGNED NOT NULL, schedule_id INT UNSIGNED NOT NULL,
 boarding_stop_id INT UNSIGNED NOT NULL, destination_stop_id INT UNSIGNED NOT NULL,
 total_amount DECIMAL(10,2) NOT NULL,
 booking_status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
 qr_token VARCHAR(100) NOT NULL UNIQUE,
 seat_snapshot VARCHAR(255) NOT NULL DEFAULT '',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
 FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE RESTRICT,
 FOREIGN KEY (boarding_stop_id) REFERENCES stops(stop_id) ON DELETE RESTRICT,
 FOREIGN KEY (destination_stop_id) REFERENCES stops(stop_id) ON DELETE RESTRICT,
 INDEX ix_booking_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_seats (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 booking_id INT UNSIGNED NOT NULL,
 schedule_id INT UNSIGNED NOT NULL,
 seat_number VARCHAR(10) NOT NULL,
 seat_fare DECIMAL(10,2) NOT NULL,
 UNIQUE KEY uq_schedule_seat (schedule_id, seat_number),
 FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
 FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feedback (
 feedback_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 rating INT UNSIGNED DEFAULT NULL,
 message TEXT NOT NULL,
 type ENUM('feedback','complaint') NOT NULL,
 status ENUM('pending','in_progress','resolved','rejected') NOT NULL DEFAULT 'pending',
 admin_response TEXT DEFAULT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
 CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notifications (
 notification_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id INT UNSIGNED NOT NULL,
 message VARCHAR(255) NOT NULL,
 is_read BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
 INDEX ix_notifications_user (user_id, created_at)
) ENGINE=InnoDB;

-- Starter transport records. The bcrypt-hashed Admin/Driver users, route stop sequences
-- and future trip schedules are created by backend/seeders/seedUsers.js.
INSERT IGNORE INTO stops (stop_name,city,address) VALUES
 ('Faizabad Terminal','Islamabad','Faizabad Interchange'),
 ('Saddar Terminal','Rawalpindi','Saddar Rawalpindi'),
 ('Gujar Khan Station','Gujar Khan','Main GT Road'),
 ('Jhelum Terminal','Jhelum','GT Road Jhelum'),
 ('Gujrat Bus Stand','Gujrat','General Bus Stand'),
 ('Thokar Niaz Baig','Lahore','Thokar Niaz Baig'),
 ('Mandi Bahauddin Terminal','Mandi Bahauddin','Main Bus Stand'),
 ('Sialkot Terminal','Sialkot','Main Bus Stand');
INSERT IGNORE INTO buses (bus_number,registration_number,bus_type,total_seats,status) VALUES
 ('CS-101','ICT-2026-101','AC',40,'available'),
 ('CS-102','RIP-2026-102','AC',36,'available'),
 ('CS-103','LHR-2026-103','Non-AC',44,'available'),
 ('CS-104','JLM-2026-104','AC',32,'available'),
 ('CS-105','SKT-2026-105','Non-AC',40,'available'),
 ('CS-106','ICT-2026-106','AC',40,'available');
