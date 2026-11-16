ALTER TABLE members ADD COLUMN bureau_position VARCHAR(50);
UPDATE members m SET bureau_position = 'DIRECTEUR'
FROM roles r
WHERE m.role_id = r.id AND r.code = 'ADMIN'
  AND m.id = (SELECT MIN(m2.id) FROM members m2 JOIN roles r2 ON r2.id = m2.role_id WHERE r2.code = 'ADMIN');

CREATE TABLE app_notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    entity_type VARCHAR(40),
    entity_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);
CREATE INDEX idx_app_notifications_recipient_created ON app_notifications(recipient_id, created_at DESC);
