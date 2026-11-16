<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // The initial Laravel baseline already creates the final schema. This
        // upgrade path is for databases that still have the original V1 schema.
        if (! Schema::hasTable('members') || Schema::hasTable('association_groups')) return;

        DB::unprepared(<<<'SQL'
CREATE TABLE association_groups (
 id BIGSERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, logo_url VARCHAR(300), city VARCHAR(80), description VARCHAR(500),
 contact_phone VARCHAR(30), contact_email VARCHAR(120), primary_color VARCHAR(20) NOT NULL DEFAULT '#1E6F5C',
 accent_color VARCHAR(20) NOT NULL DEFAULT '#2D9CDB', currency VARCHAR(20) NOT NULL DEFAULT 'FCFA',
 min_assistances_required INTEGER NOT NULL DEFAULT 2, active BOOLEAN NOT NULL DEFAULT TRUE, created_by BIGINT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), min_contribution_amount NUMERIC(14,2) NOT NULL DEFAULT 0
);
INSERT INTO association_groups(name, logo_url, currency, min_assistances_required)
SELECT COALESCE((SELECT setting_value FROM app_settings WHERE setting_key='org.name'), 'Makénéné Solidarité'),
       (SELECT setting_value FROM app_settings WHERE setting_key='org.logo.url'),
       COALESCE((SELECT setting_value FROM app_settings WHERE setting_key='org.currency'), 'FCFA'),
       COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key='rules.min.contributions'), 2);
ALTER TABLE roles ADD COLUMN group_id BIGINT;
UPDATE roles SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
ALTER TABLE roles ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_code_key;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_roles_group') THEN ALTER TABLE roles ADD CONSTRAINT fk_roles_group FOREIGN KEY(group_id) REFERENCES association_groups(id); END IF; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uk_roles_group_code ON roles(group_id, code);
ALTER TABLE members ADD COLUMN super_admin BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE members m SET super_admin=TRUE FROM roles r WHERE m.role_id=r.id AND r.code='ADMIN';
CREATE TABLE group_members (
 id BIGSERIAL PRIMARY KEY, group_id BIGINT NOT NULL REFERENCES association_groups(id), member_id BIGINT NOT NULL REFERENCES members(id),
 role_id BIGINT NOT NULL REFERENCES roles(id), is_principal_admin BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE,
 cycle_contributions INTEGER NOT NULL DEFAULT 0, total_contributions INTEGER NOT NULL DEFAULT 0,
 required_assistances_override INTEGER, bureau_position VARCHAR(50), joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT uk_group_member UNIQUE(group_id, member_id)
);
INSERT INTO group_members(group_id,member_id,role_id,is_principal_admin,active,cycle_contributions,total_contributions,required_assistances_override,bureau_position)
SELECT r.group_id,m.id,m.role_id,(r.code='ADMIN'),m.active,m.cycle_contributions,m.total_contributions,m.required_assistances_override,m.bureau_position
FROM members m JOIN roles r ON r.id=m.role_id ON CONFLICT(group_id,member_id) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_group_members_member ON group_members(member_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_role ON group_members(group_id,role_id);
ALTER TABLE assistance_types ADD COLUMN group_id BIGINT;
UPDATE assistance_types SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
ALTER TABLE assistance_types ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE assistance_types DROP CONSTRAINT IF EXISTS assistance_types_name_key;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_assistance_types_group') THEN ALTER TABLE assistance_types ADD CONSTRAINT fk_assistance_types_group FOREIGN KEY(group_id) REFERENCES association_groups(id); END IF; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uk_assistance_type_group_lower_name ON assistance_types(group_id,lower(name));
ALTER TABLE events ADD COLUMN group_id BIGINT;
UPDATE events SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
ALTER TABLE events ALTER COLUMN group_id SET NOT NULL;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_events_group') THEN ALTER TABLE events ADD CONSTRAINT fk_events_group FOREIGN KEY(group_id) REFERENCES association_groups(id); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_events_group_status ON events(group_id,status);
ALTER TABLE assistance_requests ADD COLUMN group_id BIGINT;
UPDATE assistance_requests SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
ALTER TABLE assistance_requests ALTER COLUMN group_id SET NOT NULL;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_requests_group') THEN ALTER TABLE assistance_requests ADD CONSTRAINT fk_requests_group FOREIGN KEY(group_id) REFERENCES association_groups(id); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_requests_group_created ON assistance_requests(group_id,created_at);
ALTER TABLE audit_logs ADD COLUMN group_id BIGINT REFERENCES association_groups(id);
UPDATE audit_logs SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
ALTER TABLE app_notifications ADD COLUMN group_id BIGINT REFERENCES association_groups(id);
UPDATE app_notifications SET group_id=(SELECT id FROM association_groups ORDER BY id LIMIT 1) WHERE group_id IS NULL;
SQL);
    }

    public function down(): void {}
};
