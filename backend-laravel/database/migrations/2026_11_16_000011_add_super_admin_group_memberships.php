<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('group_members') || ! Schema::hasTable('association_groups') || ! Schema::hasTable('members')) {
            return;
        }

        $groups = DB::table('association_groups')->where('active', true)->get(['id']);
        $superAdmins = DB::table('members')->where('super_admin', true)->where('active', true)->get(['id']);
        $roles = DB::table('roles')->where('code', 'MEMBRE')->get(['id', 'group_id']);
        $roleByGroup = $roles->pluck('id', 'group_id');
        $memberships = [];

        foreach ($groups as $group) {
            $roleId = $roleByGroup->get($group->id);
            if ($roleId === null) {
                continue;
            }

            foreach ($superAdmins as $member) {
                $memberships[] = [
                    'group_id' => $group->id,
                    'member_id' => $member->id,
                    'role_id' => $roleId,
                    'is_principal_admin' => false,
                    'active' => true,
                    'cycle_contributions' => 0,
                    'total_contributions' => 0,
                    'required_assistances_override' => null,
                    'bureau_position' => null,
                    'joined_at' => now(),
                ];
            }
        }

        foreach (array_chunk($memberships, 500) as $chunk) {
            DB::table('group_members')->insertOrIgnore($chunk);
        }
    }

    public function down(): void {}
};
