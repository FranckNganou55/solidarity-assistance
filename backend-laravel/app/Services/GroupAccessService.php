<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GroupAccessService
{
    public function resolveGroup(Request $request, bool $required = true): ?int
    {
        $groupId = (int) $request->header('X-Group-Id', 0);
        if ($groupId === 0) {
            if ($required) {
                abort(400, 'Sélectionnez un groupe');
            }

            return null;
        }

        $member = $request->attributes->get('member');
        if (! $member?->super_admin && ! DB::table('group_members')->where([
            'member_id' => $member?->id,
            'group_id' => $groupId,
            'active' => true,
        ])->exists()) {
            abort(403);
        }

        return $groupId;
    }

    public function allows(Request $request, string $permission): bool
    {
        $member = $request->attributes->get('member');
        if ($member?->super_admin) {
            return true;
        }

        $groupId = $this->resolveGroup($request);
        $membership = DB::table('group_members')->where([
            'member_id' => $member?->id,
            'group_id' => $groupId,
            'active' => true,
        ])->first();

        if (! $membership || $permission === 'GROUP_CREATE') {
            return false;
        }

        if ($membership->permissions_override !== null) {
            $overrides = is_array($membership->permissions_override)
                ? $membership->permissions_override
                : (json_decode((string) $membership->permissions_override, true) ?: []);

            return in_array($permission, $overrides, true);
        }

        return DB::table('role_permissions')->where([
            'role_id' => $membership->role_id,
            'permission' => $permission,
        ])->exists();
    }

    public function authorize(Request $request, string $permission): void
    {
        if (! $this->allows($request, $permission)) {
            abort(403, 'Permission insuffisante');
        }
    }
}
