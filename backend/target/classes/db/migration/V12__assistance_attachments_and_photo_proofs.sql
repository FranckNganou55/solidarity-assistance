ALTER TABLE members ADD COLUMN photo_shape VARCHAR(10) NOT NULL DEFAULT 'CIRCLE';
ALTER TABLE assistance_requests ADD COLUMN document_url VARCHAR(300);
ALTER TABLE events ADD COLUMN supporting_document_url VARCHAR(300);
ALTER TABLE contributions ADD COLUMN proof_photo_url VARCHAR(300);
ALTER TABLE contributions ADD COLUMN proof_photo_shape VARCHAR(10) NOT NULL DEFAULT 'SQUARE';
