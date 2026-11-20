<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\AssociationGroupResource;
use App\Models\AssociationGroup;
use App\Repositories\MemberRepository;
use App\Services\PasswordHashService;
use App\Services\MemberCredentialsEmailService;
use App\Services\SensitiveSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class GroupController
{
    public function __construct(
        private readonly PasswordHashService $passwords,
        private readonly SensitiveSettingsService $sensitiveSettings,
        private readonly MemberCredentialsEmailService $credentialEmails,
        private readonly MemberRepository $membersRepository,
    ) {}

    public function index(Request $r)
    {
        Gate::forUser($r->attributes->get('member'))->authorize('viewAny', AssociationGroup::class);

        return response()->json(DB::table('association_groups')->orderBy('id')->get()->map(fn ($group) => $this->view($group)));
    }

    public function memberDirectory(Request $r)
    {
        Gate::forUser($r->attributes->get('member'))->authorize('viewAny', AssociationGroup::class);

        return response()->json(DB::table('members')->where('active', true)->orderBy('first_name')->orderBy('last_name')->get(['id', 'first_name', 'last_name', 'phone'])->map(fn ($member) => [
            'id' => (int) $member->id,
            'fullName' => trim($member->first_name.' '.$member->last_name),
            'phone' => $member->phone,
        ]));
    }

    public function create(Request $r)
    {
        Gate::forUser($r->attributes->get('member'))->authorize('create', AssociationGroup::class);
        $d = $r->validate(['name' => 'required|string|max:120', 'logoUrl' => 'nullable|string|max:300', 'city' => 'nullable|string|max:80', 'description' => 'nullable|string|max:500', 'contactPhone' => 'nullable|string|max:30', 'contactEmail' => 'nullable|email|max:120', 'primaryColor' => 'nullable|string|max:20', 'accentColor' => 'nullable|string|max:20', 'currency' => 'nullable|string|max:20', 'minAssistancesRequired' => 'nullable|integer|min:0', 'admin.firstName' => 'required|string|max:80', 'admin.lastName' => 'required|string|max:80', 'admin.phone' => 'required|string|max:30', 'admin.quarter' => 'nullable|string|max:80', 'admin.email' => 'required|email|max:120', 'admin.password' => 'nullable|string|max:1024']);
        $existingMember = DB::table('members')->where('phone', trim($d['admin']['phone']))->first();
        if ($this->membersRepository->emailInUse($d['admin']['email'], $existingMember ? (int) $existingMember->id : null)) {
            return response()->json(['code' => 'conflict', 'message' => 'Cette adresse e-mail est déjà associée à un autre compte'], 409);
        }
        if ($existingMember && (bool) $existingMember->super_admin) {
            return response()->json(['code' => 'conflict', 'message' => 'Le super administrateur global ne peut pas être nommé administrateur principal du groupe. Choisissez un autre membre.'], 409);
        }
        if ($existingMember && ! (bool) $existingMember->active) {
            return response()->json(['code' => 'conflict', 'message' => 'Ce compte existe déjà mais il est inactif. Réactivez-le avant de le nommer administrateur principal.'], 409);
        }
        $configuredPassword = $this->sensitiveSettings->defaultPassword();
        $temporaryPassword = $existingMember
            ? null
            : (empty($d['admin']['password']) ? ($configuredPassword ?: Str::random(14)) : null);
        $credentialPassword = $existingMember ? null : ($d['admin']['password'] ?? $temporaryPassword);
        $result = DB::transaction(function () use ($d, $r, $temporaryPassword, $existingMember) {
            $g = DB::table('association_groups')->insertGetId(['name' => $d['name'], 'logo_url' => $d['logoUrl'] ?? null, 'city' => $d['city'] ?? null, 'description' => $d['description'] ?? null, 'contact_phone' => $d['contactPhone'] ?? null, 'contact_email' => $d['contactEmail'] ?? null, 'primary_color' => $d['primaryColor'] ?? '#1E6F5C', 'accent_color' => $d['accentColor'] ?? '#2D9CDB', 'currency' => $d['currency'] ?? 'FCFA', 'min_assistances_required' => $d['minAssistancesRequired'] ?? 2, 'min_contribution_amount' => 0, 'active' => true, 'created_by' => $r->attributes->get('memberId'), 'created_at' => now()]);
            $memberRole = DB::table('roles')->insertGetId(['group_id' => $g, 'code' => 'MEMBRE', 'name' => 'Membre', 'description' => 'Membre de l’association', 'system_role' => true, 'created_at' => now()]);
            $adminRole = DB::table('roles')->insertGetId(['group_id' => $g, 'code' => 'ADMIN_PRINCIPAL', 'name' => 'Administrateur principal', 'description' => 'Gestion du groupe', 'system_role' => true, 'created_at' => now()]);
            $all = ['GROUP_VIEW', 'GROUP_MANAGE', 'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_THRESHOLD_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE', 'MEMBER_RESET_PASSWORD', 'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN', 'ASSISTANCE_TYPE_VIEW', 'ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE', 'EVENT_VIEW', 'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_CLOSE', 'EVENT_EDIT_CLOSED', 'EVENT_REOPEN', 'EVENT_CANCEL', 'REQUEST_CREATE', 'REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'REQUEST_OVERRIDE_ELIGIBILITY', 'CONTRIBUTION_SUBMIT', 'CONTRIBUTION_VIEW', 'CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT', 'REPORT_VIEW', 'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'AUDIT_VIEW'];
            foreach ($all as $p) {
                DB::table('role_permissions')->insert(['role_id' => $adminRole, 'permission' => $p]);
            }
            $admin = $d['admin'];
            if ($existingMember) {
                $mid = (int) $existingMember->id;
                if (! filled($existingMember->email) && filled($admin['email'] ?? null)) {
                    DB::table('members')->where('id', $mid)->update(['email' => trim($admin['email']), 'updated_at' => now()]);
                }
            } else {
                $mid = DB::table('members')->insertGetId(['last_name' => $admin['lastName'], 'first_name' => $admin['firstName'], 'phone' => trim($admin['phone']), 'city' => $d['city'] ?? 'Makenene', 'quarter' => $admin['quarter'] ?? null, 'email' => $admin['email'] ?? null, 'password_hash' => $this->passwords->make($admin['password'] ?? $temporaryPassword), 'must_change_password' => true, 'active' => true, 'role_id' => $adminRole, 'cycle_contributions' => 0, 'total_contributions' => 0, 'photo_shape' => 'CIRCLE', 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('group_members')->insert(['group_id' => $g, 'member_id' => $mid, 'role_id' => $adminRole, 'is_principal_admin' => true, 'active' => true, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);
            $superAdmin = $r->attributes->get('member');
            DB::table('group_members')->insert(['group_id' => $g, 'member_id' => $superAdmin->id, 'role_id' => $memberRole, 'is_principal_admin' => false, 'active' => (bool) $superAdmin->active, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);
            // Seed personal membership and base roles so the new group works immediately.
            DB::table('role_permissions')->insert(['role_id' => $memberRole, 'permission' => 'EVENT_VIEW']);

            $member = DB::table('members')->where('id', $mid)->first();

            return [
                'group' => DB::table('association_groups')->where('id', $g)->first(),
                'memberName' => trim($member->first_name.' '.$member->last_name),
                'memberEmail' => filled($member->email) ? $member->email : trim((string) $admin['email']),
                'memberPhone' => $member->phone,
                'existingAccount' => (bool) $existingMember,
            ];
        });

        $credentialsEmailQueued = false;
        $emailFailureReason = null;
        $group = $result['group'];
        $adminEmail = trim((string) $result['memberEmail']);
        if ($adminEmail === '') {
            $emailFailureReason = 'Aucune adresse e-mail n’est associée à ce compte.';
        } elseif (in_array(config('mail.default'), ['log', 'array'], true)) {
            $emailFailureReason = 'Le transport e-mail n’est pas configuré pour un envoi réel.';
        } elseif ($adminEmail !== '') {
            $credentialsEmailQueued = $this->credentialEmails->schedule(
                $adminEmail,
                $result['memberName'],
                $group->name,
                $result['memberPhone'],
                $credentialPassword,
                rtrim((string) config('app.url'), '/').'/login?group='.$group->id,
                ['group_id' => $group->id, 'reason' => 'principal_admin_created'],
            );
        }
        $response = $this->view($group) + ['credentialsEmailQueued' => $credentialsEmailQueued, 'principalAdminExistingAccount' => $result['existingAccount']];
        if (! $credentialsEmailQueued) {
            $response['temporaryPassword'] = $credentialPassword;
            if ($emailFailureReason !== null) {
                $response['credentialsEmailError'] = $emailFailureReason;
            }
        }

        return response()->json($response, 201);
    }

    public function update(Request $r, int $id)
    {
        $groupModel = AssociationGroup::query()->findOrFail($id);
        Gate::forUser($r->attributes->get('member'))->authorize('update', $groupModel);
        $d = $r->validate(['name' => 'sometimes|required|string|max:120', 'logoUrl' => 'nullable|string|max:300', 'city' => 'nullable|string|max:80', 'description' => 'nullable|string|max:500', 'contactPhone' => 'nullable|string|max:30', 'contactEmail' => 'nullable|email|max:120', 'primaryColor' => 'sometimes|string|max:20', 'accentColor' => 'sometimes|string|max:20', 'currency' => 'sometimes|string|max:20', 'minAssistancesRequired' => 'sometimes|integer|min:0', 'active' => 'sometimes|boolean']);
        $map = ['name' => 'name', 'logoUrl' => 'logo_url', 'city' => 'city', 'description' => 'description', 'contactPhone' => 'contact_phone', 'contactEmail' => 'contact_email', 'primaryColor' => 'primary_color', 'accentColor' => 'accent_color', 'currency' => 'currency', 'minAssistancesRequired' => 'min_assistances_required', 'active' => 'active'];
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
        $groupModel = AssociationGroup::query()->findOrFail($id);
        Gate::forUser($r->attributes->get('member'))->authorize('delete', $groupModel);
        $group = DB::table('association_groups')->where('id', $id)->first();
        abort_unless($group, 404, 'Groupe introuvable');
        $active = DB::table('association_groups')->where('active', true)->count();
        if ($active <= 1) {
            abort(409, 'Au moins un groupe actif doit être conservé');
        }
        DB::transaction(function () use ($id) {
            $roleIds = DB::table('roles')->where('group_id', $id)->pluck('id');
            $eventIds = DB::table('events')->where('group_id', $id)->pluck('id');

            // Preserve globally shared member accounts by moving their legacy role
            // reference to a role in another group before deleting this group's roles.
            $fallbackGroupId = DB::table('association_groups')->where('id', '<>', $id)->where('active', true)->orderBy('id')->value('id');
            $fallbackRoleId = DB::table('roles')->where('group_id', $fallbackGroupId)->where('code', 'MEMBRE')->value('id')
                ?? DB::table('roles')->where('group_id', $fallbackGroupId)->orderBy('id')->value('id');
            if (! $fallbackRoleId && $roleIds->isNotEmpty() && DB::table('members')->whereIn('role_id', $roleIds)->exists()) {
                abort(409, 'Impossible de supprimer ce groupe tant qu’aucun autre groupe ne possède un rôle de membre.');
            }
            if ($fallbackRoleId && $roleIds->isNotEmpty()) {
                DB::table('members')->whereIn('role_id', $roleIds)->update(['role_id' => $fallbackRoleId]);
            }

            DB::table('app_notifications')->where('group_id', $id)->delete();
            DB::table('audit_logs')->where('group_id', $id)->delete();
            DB::table('assistance_requests')->where('group_id', $id)->delete();
            if ($eventIds->isNotEmpty()) {
                DB::table('contributions')->whereIn('event_id', $eventIds)->delete();
                DB::table('events')->whereIn('id', $eventIds)->delete();
            }
            DB::table('assistance_types')->where('group_id', $id)->delete();
            DB::table('group_members')->where('group_id', $id)->delete();
            DB::table('roles')->where('group_id', $id)->delete();
            DB::table('association_groups')->where('id', $id)->delete();
        });

        return response()->json(['message' => 'Groupe et données associées supprimés définitivement']);
    }

    public function addMember(Request $r, int $groupId)
    {
        if (! $r->attributes->get('member')->super_admin) {
            abort(403);
        }
        $memberId = (int) $r->validate(['memberId' => 'required|integer'])['memberId'];
        abort_unless(DB::table('members')->where(['id' => $memberId, 'active' => true])->exists(), 404, 'Membre actif introuvable.');
        abort_unless(DB::table('association_groups')->where(['id' => $groupId, 'active' => true])->exists(), 404, 'Groupe actif introuvable.');
        $role = DB::table('roles')->where(['group_id' => $groupId, 'code' => 'MEMBRE'])->first();
        if (! $role) {
            abort(404, 'Rôle de membre introuvable');
        }
        $inserted = DB::table('group_members')->insertOrIgnore(['group_id' => $groupId, 'member_id' => $memberId, 'role_id' => $role->id, 'is_principal_admin' => false, 'active' => true, 'cycle_contributions' => 0, 'total_contributions' => 0, 'joined_at' => now()]);

        return response()->json(['message' => $inserted ? 'Membre ajouté au groupe' : 'Ce membre appartient déjà à ce groupe.', 'added' => (bool) $inserted]);
    }

    private function view(object $g): array
    {
        return AssociationGroupResource::make(['id' => (int) $g->id, 'name' => $g->name, 'logoUrl' => $g->logo_url, 'city' => $g->city, 'description' => $g->description, 'contactPhone' => $g->contact_phone, 'contactEmail' => $g->contact_email, 'primaryColor' => $g->primary_color, 'accentColor' => $g->accent_color, 'currency' => $g->currency, 'minAssistancesRequired' => (int) $g->min_assistances_required, 'principalAdmin' => false, 'active' => (bool) $g->active])->resolve();
    }

}
