<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('role_permissions')) return;
        DB::unprepared(<<<'SQL'
WITH permission_map(old_code,new_code) AS (VALUES
 ('MEMBER_MANAGE','MEMBER_CREATE'),('MEMBER_MANAGE','MEMBER_EDIT'),('MEMBER_MANAGE','MEMBER_DELETE'),('MEMBER_MANAGE','MEMBER_ARCHIVE'),
 ('ROLE_MANAGE','ROLE_CREATE'),('ROLE_MANAGE','ROLE_EDIT'),('ROLE_MANAGE','ROLE_DELETE'),('ROLE_MANAGE','ROLE_ASSIGN'),
 ('ASSISTANCE_TYPE_MANAGE','ASSISTANCE_TYPE_CREATE'),('ASSISTANCE_TYPE_MANAGE','ASSISTANCE_TYPE_EDIT'),('ASSISTANCE_TYPE_MANAGE','ASSISTANCE_TYPE_DELETE'),
 ('EVENT_MANAGE','EVENT_CREATE'),('EVENT_MANAGE','EVENT_EDIT'),('REQUEST_MANAGE','REQUEST_VIEW'),('REQUEST_MANAGE','REQUEST_APPROVE'),
 ('REQUEST_MANAGE','REQUEST_REJECT'),('CONTRIBUTION_VALIDATE','CONTRIBUTION_REJECT'))
INSERT INTO role_permissions(role_id,permission)
SELECT rp.role_id,pm.new_code FROM role_permissions rp JOIN permission_map pm ON pm.old_code=rp.permission
ON CONFLICT DO NOTHING;
DELETE FROM role_permissions WHERE permission IN ('MEMBER_MANAGE','ROLE_MANAGE','ASSISTANCE_TYPE_MANAGE','EVENT_MANAGE','REQUEST_MANAGE');
SQL);
    }

    public function down(): void {}
};
