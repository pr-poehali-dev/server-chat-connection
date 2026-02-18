
ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE;
CREATE INDEX idx_users_phone ON users(phone);
