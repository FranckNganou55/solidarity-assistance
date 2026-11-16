ALTER TABLE events ADD COLUMN requested_at TIMESTAMPTZ;

-- Les assistances déjà existantes gardent une date exploitable dans l’historique.
UPDATE events SET requested_at = created_at WHERE requested_at IS NULL;
