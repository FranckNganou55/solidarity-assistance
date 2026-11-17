<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('group_members') || ! Schema::hasTable('role_permissions')) {
            return;
        }

        $permissions = [
            'GROUP_VIEW', 'GROUP_MANAGE',
            'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_THRESHOLD_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE', 'MEMBER_RESET_PASSWORD',
            'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN',
            'ASSISTANCE_TYPE_VIEW', 'ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE',
            'EVENT_VIEW', 'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_CLOSE', 'EVENT_EDIT_CLOSED', 'EVENT_REOPEN', 'EVENT_CANCEL',
            'REQUEST_CREATE', 'REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'REQUEST_OVERRIDE_ELIGIBILITY',
            'CONTRIBUTION_SUBMIT', 'CONTRIBUTION_VIEW', 'CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT',
            'REPORT_VIEW', 'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'AUDIT_VIEW',
        ];

        $roleIds = DB::table('group_members')->where('is_principal_admin', true)->pluck('role_id')->unique();
        foreach ($roleIds as $roleId) {
            DB::table('role_permissions')->insertOrIgnore(array_map(
                fn (string $permission): array => ['role_id' => $roleId, 'permission' => $permission],
                $permissions,
            ));
        }
    }

    public function down(): void
    {
        // Do not remove permissions: they may have been edited by administrators since migration.
    }
};
