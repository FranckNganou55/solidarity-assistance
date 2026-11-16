ALTER TABLE events ADD COLUMN eligibility_overridden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN eligibility_override_by BIGINT REFERENCES members(id);
