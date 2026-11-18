<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('role_permissions')) {
            return;
        }

        $permissionMap = [
            'MEMBER_MANAGE' => ['MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE'],
            'ROLE_MANAGE' => ['ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN'],
            'ASSISTANCE_TYPE_MANAGE' => ['ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE'],
            'EVENT_MANAGE' => ['EVENT_CREATE', 'EVENT_EDIT'],
            'REQUEST_MANAGE' => ['REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT'],
            'CONTRIBUTION_VALIDATE' => ['CONTRIBUTION_REJECT'],
        ];

        $legacyPermissions = DB::table('role_permissions')
            ->whereIn('permission', array_keys($permissionMap))
            ->get(['role_id', 'permission']);

        foreach ($legacyPermissions as $legacyPermission) {
            $rows = array_map(
                fn (string $permission): array => ['role_id' => $legacyPermission->role_id, 'permission' => $permission],
                $permissionMap[$legacyPermission->permission],
            );
            DB::table('role_permissions')->insertOrIgnore($rows);
        }

        DB::table('role_permissions')->whereIn('permission', array_keys($permissionMap))->delete();
    }

    public function down(): void {}
};
