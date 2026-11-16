<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\AssociationGroupResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GroupController
{
    public function create(Request $r)
    {
        if (! $r->attributes->get('member')->super_admin) {
            abort(403);
        }
        $d = $r->validate(['name' => 'required|string|max:120', 'logoUrl' => 'nullable|string|max:300', 'city' => 'nullable|string|max:80', 'description' => 'nullable|string|max:500', 'contactPhone' => 'nullable|string|max:30', 'contactEmail' => 'nullable|email|max:120', 'primaryColor' => 'nullable|string|max:20', 'accentColor' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:20', 'minAssistancesRequired' => 'nullable|integer|min:0', 'admin.firstName' => 'required|string|max:80', 'admin.lastName' => 'required|string|max:80', 'admin.phone' => 'required|string|max:30', 'admin.quarter' => 'nullable|string|max:80', 'admin.email' => 'nullable|email|max:120', 'admin.password' => 'nullable|string|max:72']);
        if (DB::table('members')->where('phone', $d['admin']['phone'])->exists()) {
            return response()->json(['code' => 'conflict', 'message' => 'Un membre utilise déjà cet identifiant'], 409);
        }
        $configuredPassword = DB::table('app_settings')->where('setting_key', 'org.default.password')->value('setting_value');
        $temporaryPassword = empty($d['admin']['password']) ? ($configuredPassword ?: Str::random(14)) : null;
        $result = DB::transaction(function () use ($d, $r, $temporaryPassword) {
            $g = DB::table('association_groups')->insertGetId(['name' => $d['name'], 'logo_url' => $d['logoUrl'] ?? null, 'city' => $d['city'] ?? null, 'description' => $d['description'] ?? null, 'contact_phone' => $d['contactPhone'] ?? null, 'contact_email' => $d['contactEmail'] ?? null, 'primary_color' => $d['primaryColor'] ?? '#1E6F5C', 'accent_color' => $d['accentColor'] ?? '#2D9CDB', 'currency' => $d['currency'] ?? 'FCFA', 'min_assistances_required' => $d['minAssistancesRequired'] ?? 2, 'min_contribution_amount' => 0, 'active' => true, 'created_by' => $r->attributes->get('memberId'), 'created_at' => now()]);
            $memberRole = DB::table('roles')->insertGetId(['group_id' => $g, 'code' => 'MEMBRE', 'name' => 'Membre', 'description' => 'Membre de l’association', 'system_role' => true, 'created_at' => now()]);
            $adminRole = DB::table('roles')->insertGetId(['group_id' => $g, 'code' => 'ADMIN_PRINCIPAL', 'name' => 'Administrateur principal', 'description' => 'Gestion du groupe', 'system_role' => true, 'created_at' => now()]);
            $all = ['GROUP_VIEW', 'GROUP_MANAGE', 'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_THRESHOLD_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE', 'MEMBER_RESET_PASSWORD', 'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN', 'ASSISTANCE_TYPE_VIEW', 'ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE', 'EVENT_VIEW', 'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_CLOSE', 'EVENT_EDIT_CLOSED', 'EVENT_REOPEN', 'EVENT_CANCEL', 'REQUEST_CREATE', 'REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'REQUEST_OVERRIDE_ELIGIBILITY', 'CONTRIBUTION_SUBMIT', 'CONTRIBUTION_VIEW', 'CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT', 'REPORT_VIEW', 'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'AUDIT_VIEW'];
            foreach ($all as $p) {
                DB::table('role_permissions')->insert(['role_id' => $adminRole, 'permission' => $p]);
            }
            $admin = $d['admin'];
            $mid = DB::table('members')->insertGetId(['last_name' => $admin['lastName'], 'first_name' => $admin['firstName'], 'phone' => $admin['phone'], 'city' => $d['city'] ?? 'Makenene', 'quarter' => $admin['quarter'] ?? null, 'email' => $admin['email'] ?? null, 'password_hash' => Hash::make($admin['password'] ?? $temporaryPassword), 'must_change_password' => true, 'active' => true, 'role_id' => $adminRole, 'cycle_contributions' => 0, 'total_contributions' => 0, 'photo_shape' => 'CIRCLE', 'created_at' => now(), 'updated_at' => now()]);
            DB::table('group_members')->insert(['group_id' => $g, 'member_id' => $mid, 'role_id' => $adminRole, 'is_principal_admin' => true, 'active' => true, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);
            $superAdmin = $r->attributes->get('member');
            DB::table('group_members')->insert(['group_id' => $g, 'member_id' => $superAdmin->id, 'role_id' => $memberRole, 'is_principal_admin' => false, 'active' => (bool) $superAdmin->active, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);
            // Seed personal membership and base roles so the new group works immediately.
            DB::table('role_permissions')->insert(['role_id' => $memberRole, 'permission' => 'EVENT_VIEW']);

            return DB::table('association_groups')->where('id', $g)->first();
        });

        return response()->json($this->view($result) + ($temporaryPassword ? ['temporaryPassword' => $temporaryPassword] : []), 201);
    }

    public function update(Request $r, int $id)
    {
        if (! $r->attributes->get('member')->super_admin) {
            abort(403);
        }
        $d = $r->validate(['name' => 'sometimes|required|string|max:120', 'logoUrl' => 'nullable|string|max:300', 'city' => 'nullable|string|max:80', 'description' => 'nullable|string|max:500', 'contactPhone' => 'nullable|string|max:30', 'contactEmail' => 'nullable|email|max:120', 'primaryColor' => 'sometimes|string|max:20', 'accentColor' => 'sometimes|string|max:20', 'currency' => 'sometimes|string|max:20', 'minAssistancesRequired' => 'sometimes|integer|min:0']);
        $map = ['name' => 'name', 'logoUrl' => 'logo_url', 'city' => 'city', 'description' => 'description', 'contactPhone' => 'contact_phone', 'contactEmail' => 'contact_email', 'primaryColor' => 'primary_color', 'accentColor' => 'accent_color', 'currency' => 'currency', 'minAssistancesRequired' => 'min_assistances_required'];
        $values = [];
        foreach ($map as $k => $v) {
            if (array_key_exists($k, $d)) {
                $values[$v] = $d[$k];
            }
        } DB::table('association_groups')->where('id', $id)->update($values);
        $group = DB::table('association_groups')->where('id', $id)->first();
        if (! $group) {
            abort(404);
        }

        return response()->json($this->view($group));
    }

    public function delete(Request $r, int $id)
    {
        if (! $r->attributes->get('member')->super_admin) {
            abort(403);
        }
        $active = DB::table('association_groups')->where('active', true)->count();
        if ($active <= 1) {
            abort(409, 'Au moins un groupe actif doit être conservé');
        }
        DB::transaction(function () use ($id) {
            DB::table('association_groups')->where('id', $id)->update(['active' => false]);
            DB::table('group_members')->where('group_id', $id)->update(['active' => false]);
        });

        return response()->noContent();
    }

    public function addMember(Request $r, int $groupId)
    {
        if (! $r->attributes->get('member')->super_admin) {
            abort(403);
        }
        $memberId = (int) $r->validate(['memberId' => 'required|integer'])['memberId'];
        $source = DB::table('group_members')->where(['group_id' => $r->header('X-Group-Id'), 'member_id' => $memberId])->first();
        $role = DB::table('roles')->where(['group_id' => $groupId, 'code' => 'MEMBRE'])->first();
        if (! $role) {
            abort(404, 'Rôle de membre introuvable');
        }
        DB::table('group_members')->insertOrIgnore(['group_id' => $groupId, 'member_id' => $memberId, 'role_id' => $role->id, 'is_principal_admin' => false, 'active' => true, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);

        return response()->json(['message' => 'Membre ajouté au groupe']);
    }

    private function view(object $g): array
    {
        return AssociationGroupResource::make(['id' => (int) $g->id, 'name' => $g->name, 'logoUrl' => $g->logo_url, 'city' => $g->city, 'description' => $g->description, 'contactPhone' => $g->contact_phone, 'contactEmail' => $g->contact_email, 'primaryColor' => $g->primary_color, 'accentColor' => $g->accent_color, 'currency' => $g->currency, 'minAssistancesRequired' => (int) $g->min_assistances_required, 'principalAdmin' => false])->resolve();
    }
}
