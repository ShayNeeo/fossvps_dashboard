-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with argon2
INSERT INTO users (username, email, password_hash, role)
VALUES (
    'admin',
    'admin@fossvps.org',
    '$argon2id$v=19$m=19456,t=2,p=1$D8YPLxKgAGIDIy8cXiCpMQ$qkR0HqgVBZwqxJ9DhD7l+Fz7BQJwLgYmPT0I/sKJKdU',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Note: The above password hash is for 'admin123'
-- Generate new password hashes for production using:
-- use argon2::{password_hash::{rand_core::OsRng, PasswordHasher, SaltString}, Argon2};
-- let salt = SaltString::generate(&mut OsRng);
-- let hash = Argon2::default().hash_password("your_password".as_bytes(), &salt).unwrap().to_string();
