-- Alternative to seed_users.py: run this directly in MySQL if you'd rather
-- not run a Python script. Passwords are hashed with Werkzeug's
-- pbkdf2:sha256, matching what models.py now expects (switched away from
-- scrypt, which some Windows Python/OpenSSL builds don't support and
-- causes a 500 error on login).
--
-- If you already ran the old seed_users.sql with scrypt hashes, run this
-- again -- it will UPDATE the existing rows to the new hash format.
--
-- Login credentials these correspond to:
--   admin1        / Admin@123        (ADMIN)
--   technician1   / Tech@123         (TECHNICIAN)
--   receptionist1 / Reception@123    (RECEPTIONIST)

USE Care_dx;

INSERT INTO users (username, email, password_hash, role, is_active) VALUES
('admin1', 'admin1@caredx.com', 'pbkdf2:sha256:1000000$KB4kSAo3z0s4ys1Y$337198c03ec6a156edadf3c624c599d8c2db6ef5b0bc212c4f9790eb0810a677', 'ADMIN', TRUE),
('technician1', 'technician1@caredx.com', 'pbkdf2:sha256:1000000$JjsFNCRwsZrGJnBO$4ffa5d517f305b8fa9f844a1cf798defe86a36a1543b937cfc3feaf7bd9f8d5f', 'TECHNICIAN', TRUE),
('receptionist1', 'receptionist1@caredx.com', 'pbkdf2:sha256:1000000$0m6WssbL7EIb3dQV$2755e74472be00788f7f75f7e62f74c716123bb90e35ef5562dd33393b2ddbe6', 'RECEPTIONIST', TRUE)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
