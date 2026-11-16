ALTER TABLE association_groups
    ADD COLUMN min_contribution_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
