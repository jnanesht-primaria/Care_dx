CREATE DATABASE IF NOT EXISTS Care_dx;
USE Care_dx;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'TECHNICIAN', 'RECEPTIONIST') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- NOTE: password_hash values must be generated with werkzeug's
-- generate_password_hash(). Use create_admin.py (see backend folder)
-- to insert real users instead of raw INSERTs, since Werkzeug's hash
-- format can't be typed in by hand.
