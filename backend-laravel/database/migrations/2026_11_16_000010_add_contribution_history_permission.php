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

        $rows = DB::table('role_permissions')
            ->where('permission', 'CONTRIBUTION_SUBMIT')
            ->pluck('role_id')
            ->unique()
            ->map(fn ($roleId): array => ['role_id' => $roleId, 'permission' => 'CONTRIBUTION_VIEW'])
            ->all();

        if ($rows !== []) {
            DB::table('role_permissions')->insertOrIgnore($rows);
        }
    }

    public function down(): void {}
};
