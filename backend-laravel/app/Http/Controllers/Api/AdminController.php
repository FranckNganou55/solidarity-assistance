<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Http\Resources\MemberResource;
use App\Mail\MemberAccessCredentials;
use App\Models\Member;
use App\Services\GroupAccessService;
use App\Services\MemberManagementService;
use App\Services\PasswordHashService;
use App\Services\SensitiveSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Throwable;

class AdminController
{
    public function __construct(
        private readonly GroupAccessService $groupAccess,
        private readonly MemberManagementService $memberManagement,
        private readonly PasswordHashService $passwords,
        private readonly SensitiveSettingsService $sensitiveSettings,
    ) {}

    private array $catalog = [
        'GROUP_CREATE' => ['Créer un groupe', 'Create a group', 'Groupes'], 'GROUP_VIEW' => ['Consulter les groupes', 'View groups', 'Groupes'], 'GROUP_MANAGE' => ['Modifier les informations du groupe', 'Manage group details', 'Groupes'],
        'MEMBER_VIEW' => ['Consulter les membres', 'View members', 'Membres'], 'MEMBER_CREATE' => ['Créer un membre', 'Create a member', 'Membres'], 'MEMBER_EDIT' => ['Modifier un membre', 'Edit a member', 'Membres'], 'MEMBER_THRESHOLD_EDIT' => ['Personnaliser le seuil d’assistance d’un membre', 'Set a member assistance threshold', 'Membres'], 'MEMBER_DELETE' => ['Supprimer un membre', 'Delete a member', 'Membres'], 'MEMBER_ARCHIVE' => ['Archiver ou restaurer un membre', 'Archive or restore a member', 'Membres'], 'MEMBER_RESET_PASSWORD' => ['Réinitialiser le mot de passe', 'Reset a password', 'Membres'],
        'ROLE_VIEW' => ['Consulter les rôles', 'View roles', 'Rôles'], 'ROLE_CREATE' => ['Créer un rôle', 'Create a role', 'Rôles'], 'ROLE_EDIT' => ['Modifier un rôle et ses permissions', 'Edit roles and permissions', 'Rôles'], 'ROLE_DELETE' => ['Supprimer un rôle', 'Delete a role', 'Rôles'], 'ROLE_ASSIGN' => ['Attribuer un rôle', 'Assign a role', 'Rôles'],
        'ASSISTANCE_TYPE_VIEW' => ['Consulter les types d’assistance', 'View assistance types', 'Types d’assistance'], 'ASSISTANCE_TYPE_CREATE' => ['Créer un type d’assistance', 'Create an assistance type', 'Types d’assistance'], 'ASSISTANCE_TYPE_EDIT' => ['Modifier un type d’assistance', 'Edit an assistance type', 'Types d’assistance'], 'ASSISTANCE_TYPE_DELETE' => ['Supprimer un type d’assistance', 'Delete an assistance type', 'Types d’assistance'],
        'EVENT_VIEW' => ['Consulter les assistances', 'View assistances', 'Assistances'], 'EVENT_CREATE' => ['Créer une assistance', 'Create an assistance', 'Assistances'], 'EVENT_EDIT' => ['Modifier une assistance ouverte', 'Edit an open assistance', 'Assistances'], 'EVENT_CLOSE' => ['Clôturer une assistance', 'Close an assistance', 'Assistances'], 'EVENT_EDIT_CLOSED' => ['Modifier une assistance clôturée', 'Edit a closed assistance', 'Assistances'], 'EVENT_REOPEN' => ['Rouvrir une assistance', 'Reopen an assistance', 'Assistances'], 'EVENT_CANCEL' => ['Annuler une assistance', 'Cancel an assistance', 'Assistances'],
        'REQUEST_CREATE' => ['Soumettre une demande', 'Submit a request', 'Demandes'], 'REQUEST_VIEW' => ['Consulter les demandes', 'View requests', 'Demandes'], 'REQUEST_APPROVE' => ['Approuver une demande', 'Approve a request', 'Demandes'], 'REQUEST_REJECT' => ['Rejeter une demande', 'Reject a request', 'Demandes'], 'REQUEST_OVERRIDE_ELIGIBILITY' => ['Autoriser une demande sous le seuil', 'Allow below-threshold requests', 'Demandes'],
        'CONTRIBUTION_SUBMIT' => ['Soumettre une cotisation', 'Submit a contribution', 'Cotisations'], 'CONTRIBUTION_VIEW' => ['Consulter ses cotisations', 'View own contributions', 'Cotisations'], 'CONTRIBUTION_VIEW_ALL' => ['Consulter toutes les cotisations', 'View group contributions', 'Cotisations'], 'CONTRIBUTION_VALIDATE' => ['Valider une cotisation', 'Validate a contribution', 'Cotisations'], 'CONTRIBUTION_REJECT' => ['Rejeter une cotisation', 'Reject a contribution', 'Cotisations'],
        'REPORT_VIEW' => ['Consulter les statistiques du groupe', 'View group reports', 'Rapports'], 'SETTINGS_VIEW' => ['Consulter les paramètres', 'View settings', 'Paramètres'], 'SETTINGS_MANAGE' => ['Modifier les paramètres', 'Manage settings', 'Paramètres'], 'AUDIT_VIEW' => ['Consulter le journal d’audit', 'View audit log', 'Administration'],
    ];

    private function member(Request $r): object
    {
        return $r->attributes->get('member');
    }

    private function id(Request $r): int
    {
        return (int) $r->attributes->get('memberId');
    }

    private function group(Request $r, bool $required = true): ?int
    {
        return $this->groupAccess->resolveGroup($r, $required);
    }

    private function allow(Request $r, string $permission): void
    {
        $this->groupAccess->authorize($r, $permission);
    }

    public function members(Request $r)
    {
        $this->allow($r, 'MEMBER_VIEW');
        $g = $this->group($r);
        $q = trim((string) $r->query('q', ''));
        $active = $r->query('active');
        $page = max(0, (int) $r->query('page', 0));
        $size = min(100, max(1, (int) $r->query('size', 50)));
        $base = DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->join('roles as role', 'role.id', '=', 'gm.role_id')->where('gm.group_id', $g);
        if ($q !== '') {
            $base->where(fn ($w) => $w->whereRaw('lower(m.first_name || \' \' || m.last_name) like ?', ['%'.mb_strtolower($q).'%'])->orWhere('m.phone', 'like', '%'.$q.'%'));
        }
        if ($active !== null) {
            if (filter_var($active, FILTER_VALIDATE_BOOLEAN)) {
                $base->where('gm.active', true)->where('m.active', true);
            } else {
                $base->where(fn ($w) => $w->where('gm.active', false)->orWhere('m.active', false));
            }
        }
        $total = (clone $base)->count();
        $rows = $base->orderBy('m.first_name')->offset($page * $size)->limit($size)->get();
        $defaultThreshold = (int) (DB::table('association_groups')->where('id', $g)->value('min_assistances_required') ?? 0);
        $roleIds = $rows->pluck('role_id')->unique()->values();
        $permissionsByRole = $roleIds->isEmpty()
            ? []
            : DB::table('role_permissions')->whereIn('role_id', $roleIds)->get()->groupBy('role_id')->map(fn ($permissions) => $permissions->pluck('permission')->all())->all();

        return response()->json(['content' => $rows->map(fn ($row) => $this->memberDto($row, $g, $defaultThreshold, $permissionsByRole))->values(), 'page' => $page, 'size' => $size, 'totalElements' => $total, 'totalPages' => (int) ceil($total / $size), 'last' => (($page + 1) * $size >= $total)]);
    }

    public function memberDetail(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_VIEW');
        $g = $this->group($r);
        $row = DB::table('group_members as gm')
            ->join('members as m', 'm.id', '=', 'gm.member_id')
            ->join('roles as role', 'role.id', '=', 'gm.role_id')
            ->where(['gm.group_id' => $g, 'm.id' => $id])
            ->select('gm.*', 'm.*', 'gm.role_id as role_id', 'gm.active as group_active', 'gm.cycle_contributions as group_cycle_contributions', 'gm.total_contributions as group_total_contributions', 'gm.required_assistances_override as group_required_assistances_override', 'gm.bureau_position as group_bureau_position', 'role.name', 'role.code')
            ->first();
        abort_unless($row, 404, 'Membre introuvable dans ce groupe');

        return response()->json($this->memberDto($row, $g));
    }

    private function memberDto(object $row, int $g, ?int $defaultThreshold = null, ?array $permissionsByRole = null): array
    {
        $groupOverride = property_exists($row, 'group_required_assistances_override') ? $row->group_required_assistances_override : $row->required_assistances_override;
        $defaultThreshold ??= (int) (DB::table('association_groups')->where('id', $g)->value('min_assistances_required') ?? 0);
        $required = $groupOverride ?? $defaultThreshold;
        $cycle = (int) ($row->group_cycle_contributions ?? $row->cycle_contributions);
        $totalContributions = (int) ($row->group_total_contributions ?? $row->total_contributions);
        $bureauPosition = property_exists($row, 'group_bureau_position') ? $row->group_bureau_position : $row->bureau_position;
        if (property_exists($row, 'permissions_override') && $row->permissions_override !== null) {
            $perms = is_array($row->permissions_override)
                ? $row->permissions_override
                : (json_decode((string) $row->permissions_override, true) ?: []);
        } elseif ($permissionsByRole !== null) {
            $perms = $permissionsByRole[$row->role_id] ?? [];
        } else {
            $perms = DB::table('role_permissions')->where('role_id', $row->role_id)->pluck('permission')->all();
        }
        if ($row->super_admin) {
            $perms = array_keys($this->catalog);
        }
        $isActive = (bool) ($row->group_active ?? true) && (bool) $row->active;

        return MemberResource::make(['id' => (int) $row->member_id, 'lastName' => $row->last_name, 'firstName' => $row->first_name, 'fullName' => trim($row->first_name.' '.$row->last_name), 'phone' => $row->phone, 'city' => $row->city, 'quarter' => $row->quarter, 'photoUrl' => $row->photo_url, 'email' => $row->email, 'active' => $isActive, 'status' => $isActive ? 'ACTIVE' : 'INACTIVE', 'roleId' => (int) $row->role_id, 'roleCode' => $row->code, 'roleName' => $row->name, 'superAdmin' => (bool) $row->super_admin, 'groupAdmin' => (bool) $row->is_principal_admin, 'mustChangePassword' => (bool) $row->must_change_password, 'cycleContributions' => $cycle, 'totalContributions' => $totalContributions, 'requiredAssistances' => $required, 'requiredAssistancesOverride' => $groupOverride, 'bureauPosition' => $bureauPosition, 'eligibleForAssistance' => $cycle >= (int) $required, 'createdAt' => $row->created_at, 'lastLoginAt' => $row->last_login_at, 'permissions' => array_values(array_unique($perms)), 'photoShape' => $row->photo_shape ?? 'CIRCLE'])->resolve();
    }

    public function createMember(StoreMemberRequest $r)
    {
        $this->allow($r, 'MEMBER_CREATE');
        $g = $this->group($r);
        $d = $r->validated();
        if (array_key_exists('requiredAssistancesOverride', $d)) {
            $this->allow($r, 'MEMBER_THRESHOLD_EDIT');
        }
        if (Member::query()->where('phone', trim($d['phone']))->exists()) {
            return response()->json(['code' => 'conflict', 'message' => 'Ce numéro est déjà utilisé'], 409);
        }
        $created = $this->memberManagement->createForGroup($g, $d);
        $credentialsEmailSent = false;
        $emailFailureReason = null;
        $email = trim((string) $d['email']);
        if (in_array(config('mail.default'), ['log', 'array'], true)) {
            $emailFailureReason = 'Le transport e-mail n’est pas configuré pour un envoi réel.';
        } elseif ($email !== '') {
            try {
                $groupName = (string) DB::table('association_groups')->where('id', $g)->value('name');
                Mail::to($email)->send(new MemberAccessCredentials(
                    trim($created['member']->first_name.' '.$created['member']->last_name),
                    $groupName,
                    $created['member']->phone,
                    $created['temporaryPassword'],
                    rtrim((string) config('app.url'), '/').'/login?group='.$g,
                ));
                $credentialsEmailSent = true;
                Log::info('Member credential email accepted by the SMTP transport.', ['member_id' => $created['member']->id, 'group_id' => $g]);
            } catch (Throwable $exception) {
                $emailFailureReason = $this->safeMailFailureReason($exception);
                Log::warning('Could not send new member access credentials.', [
                    'member_id' => $created['member']->id,
                    'group_id' => $g,
                    'exception' => $exception::class,
                    'reason' => $this->safeMailFailureReason($exception),
                ]);
            }
        }
        $row = DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->join('roles as role', 'role.id', '=', 'gm.role_id')->where(['gm.group_id' => $g, 'm.id' => $created['member']->id])->select('gm.*', 'm.*', 'gm.role_id as role_id', 'gm.active as group_active', 'gm.cycle_contributions as group_cycle_contributions', 'gm.total_contributions as group_total_contributions', 'gm.required_assistances_override as group_required_assistances_override', 'gm.bureau_position as group_bureau_position', 'role.name', 'role.code')->first();

        $response = ['member' => $this->memberDto($row, $g), 'credentialsEmailSent' => $credentialsEmailSent];
        if (! $credentialsEmailSent) {
            $response['temporaryPassword'] = $created['temporaryPassword'];
            if ($emailFailureReason !== null) {
                $response['credentialsEmailError'] = $emailFailureReason;
            }
        }

        return response()->json($response, 201);
    }

    public function updateMember(UpdateMemberRequest $r, int $id)
    {
        $this->allow($r, 'MEMBER_EDIT');
        $g = $this->group($r);
        $d = $r->validated();
        if (array_key_exists('requiredAssistancesOverride', $d)) {
            $this->allow($r, 'MEMBER_THRESHOLD_EDIT');
        }
        $personalFields = ['firstName', 'lastName', 'phone', 'city', 'quarter', 'email', 'photoUrl', 'photoShape'];
        $member = Member::query()->findOrFail($id);
        $personalColumns = ['firstName' => 'first_name', 'lastName' => 'last_name', 'phone' => 'phone', 'city' => 'city', 'quarter' => 'quarter', 'email' => 'email', 'photoUrl' => 'photo_url', 'photoShape' => 'photo_shape'];
        $changesPersonalData = false;
        foreach ($personalFields as $field) {
            $column = $personalColumns[$field];
            if (array_key_exists($field, $d) && ($d[$field] ?? null) !== ($member->{$column} ?? null)) {
                $changesPersonalData = true;
                break;
            }
        }
        if (! $this->member($r)->super_admin && $changesPersonalData && DB::table('group_members')->where('member_id', $id)->where('active', true)->count() > 1) {
            abort(403, 'La fiche globale de ce membre est partagée entre plusieurs groupes. Seul le super administrateur peut la modifier.');
        }
        $memberData = [];
        foreach (['firstName' => 'first_name', 'lastName' => 'last_name', 'phone' => 'phone', 'city' => 'city', 'quarter' => 'quarter', 'email' => 'email', 'photoUrl' => 'photo_url', 'photoShape' => 'photo_shape'] as $key => $column) {
            if (array_key_exists($key, $d)) {
                $memberData[$column] = $d[$key];
            }
        }
        $gmData = [];
        if (array_key_exists('requiredAssistancesOverride', $d)) {
            $gmData['required_assistances_override'] = $d['requiredAssistancesOverride'];
        } if (array_key_exists('active', $d)) {
            $gmData['active'] = $d['active'];
        }
        $this->memberManagement->updateWithinGroup($id, $g, $memberData, $gmData);

        return response()->json($this->memberDto(DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->join('roles as role', 'role.id', '=', 'gm.role_id')->where(['gm.group_id' => $g, 'm.id' => $id])->select('gm.*', 'm.*', 'gm.role_id as role_id', 'gm.active as group_active', 'gm.cycle_contributions as group_cycle_contributions', 'gm.total_contributions as group_total_contributions', 'gm.required_assistances_override as group_required_assistances_override', 'gm.bureau_position as group_bureau_position', 'role.name', 'role.code')->first(), $g));
    }

    public function memberStatus(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_ARCHIVE');
        $g = $this->group($r);
        $active = (bool) $r->validate(['active' => 'required|boolean'])['active'];
        $membershipUpdates = ['active' => $active];
        if ($active) {
            $membershipUpdates['archived_at'] = null;
        } else {
            $membershipUpdates['bureau_position'] = null;
            $membershipUpdates['archived_at'] = now();
        }
        DB::table('group_members')->where(['group_id' => $g, 'member_id' => $id])->update($membershipUpdates);

        return response()->json($this->memberDto(DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->join('roles as role', 'role.id', '=', 'gm.role_id')->where(['gm.group_id' => $g, 'm.id' => $id])->select('gm.*', 'm.*', 'gm.role_id as role_id', 'gm.active as group_active', 'gm.cycle_contributions as group_cycle_contributions', 'gm.total_contributions as group_total_contributions', 'gm.required_assistances_override as group_required_assistances_override', 'gm.bureau_position as group_bureau_position', 'role.name', 'role.code')->first(), $g));
    }

    public function deleteMember(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_DELETE');
        // Preserve the membership row so Archives keeps the member and their history.
        DB::table('group_members')->where(['group_id' => $this->group($r), 'member_id' => $id])->update([
            'active' => false,
            'bureau_position' => null,
            'archived_at' => now(),
        ]);

        return response()->json(['message' => 'Membre archivé et accès au groupe révoqué']);
    }

    public function assignRole(Request $r, int $id)
    {
        $this->allow($r, 'ROLE_ASSIGN');
        $g = $this->group($r);
        $rid = (int) $r->validate(['roleId' => 'required|integer'])['roleId'];
        if (! DB::table('roles')->where(['id' => $rid, 'group_id' => $g])->exists()) {
            abort(400, 'Rôle invalide');
        } DB::table('group_members')->where(['group_id' => $g, 'member_id' => $id])->update(['role_id' => $rid]);

        return response()->json(['message' => 'Rôle attribué']);
    }

    public function updateMemberPermissions(Request $r, int $id)
    {
        $this->allow($r, 'ROLE_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['permissions' => 'present|array', 'permissions.*' => 'required|string|max:60']);
        $membership = DB::table('group_members as gm')
            ->join('members as m', 'm.id', '=', 'gm.member_id')
            ->where(['gm.group_id' => $g, 'gm.member_id' => $id])
            ->select('gm.*', 'm.super_admin')
            ->first();

        abort_unless($membership, 404, 'Membre introuvable dans ce groupe');
        abort_if((bool) $membership->super_admin, 403, 'Les permissions du super administrateur ne peuvent pas être limitées depuis un groupe.');

        $permissions = array_values(array_unique(array_intersect($d['permissions'], array_keys($this->catalog))));
        DB::table('group_members')->where(['group_id' => $g, 'member_id' => $id])->update(['permissions_override' => json_encode($permissions)]);

        return response()->json(['message' => 'Permissions individuelles mises à jour', 'permissions' => $permissions]);
    }

    public function resetPassword(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_RESET_PASSWORD');
        $groupId = $this->group($r);
        $target = DB::table('members as m')->join('group_members as gm', 'gm.member_id', '=', 'm.id')->join('association_groups as ag', 'ag.id', '=', 'gm.group_id')->where(['m.id' => $id, 'gm.group_id' => $groupId])->select('m.super_admin', 'm.email', 'm.first_name', 'm.last_name', 'm.phone', 'ag.name as group_name')->first();
        if (! $target) {
            abort(404, 'Membre introuvable dans ce groupe');
        }
        if (! $this->member($r)->super_admin && ($target->super_admin || DB::table('group_members')->where('member_id', $id)->where('active', true)->count() > 1)) {
            abort(403, 'La réinitialisation de ce compte partagé est réservée au super administrateur.');
        }
        $password = Str::random(10);
        DB::table('members')->where('id', $id)->update(['password_hash' => $this->passwords->make($password), 'must_change_password' => true]);

        $credentialsEmailSent = false;
        $emailFailureReason = null;
        if (! filled($target->email)) {
            $emailFailureReason = 'Aucune adresse e-mail n’est enregistrée pour ce membre.';
        } elseif (in_array(config('mail.default'), ['log', 'array'], true)) {
            $emailFailureReason = 'Le transport e-mail n’est pas configuré pour un envoi réel.';
        } else {
            try {
                $sentMessage = Mail::to($target->email)->send(new MemberAccessCredentials(
                    trim($target->first_name.' '.$target->last_name),
                    $target->group_name,
                    $target->phone,
                    $password,
                    rtrim((string) config('app.url'), '/').'/login?group='.$groupId,
                ));
                $credentialsEmailSent = true;
                Log::info('Reset member credential email accepted by the SMTP transport.', [
                    'member_id' => $id,
                    'group_id' => $groupId,
                    'recipient' => $this->maskEmail($target->email),
                    'message_id' => $sentMessage?->getMessageId(),
                ]);
            } catch (Throwable $exception) {
                $emailFailureReason = $this->safeMailFailureReason($exception);
                Log::warning('Could not send reset member access credentials.', [
                    'member_id' => $id,
                    'group_id' => $groupId,
                    'exception' => $exception::class,
                    'reason' => $this->safeMailFailureReason($exception),
                ]);
            }
        }

        return response()->json($credentialsEmailSent
            ? ['credentialsEmailSent' => true]
            : ['credentialsEmailSent' => false, 'temporaryPassword' => $password, 'credentialsEmailError' => $emailFailureReason]);
    }

    public function resetCycle(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_THRESHOLD_EDIT');
        DB::table('group_members')->where(['group_id' => $this->group($r), 'member_id' => $id])->update(['cycle_contributions' => 0]);

        return response()->json(['message' => 'Compteur remis à zéro']);
    }

    private function safeMailFailureReason(Throwable $exception): string
    {
        $reason = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[email]', $exception->getMessage()) ?? 'Mail transport failed';
        $reason = preg_replace('/(password|pass|token|secret|authorization)\s*[:=]\s*[^\s,;]+/i', '$1=[redacted]', $reason) ?? $reason;

        return Str::limit($reason, 350);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return $domain === '' ? '[email invalide]' : Str::substr($local, 0, 1).'***@'.$domain;
    }

    public function roles(Request $r)
    {
        $this->allow($r, 'ROLE_VIEW');
        $g = $this->group($r);

        return response()->json(DB::table('roles')->where('group_id', $g)->orderBy('name')->get()->map(fn ($role) => ['id' => $role->id, 'code' => $role->code, 'name' => $role->name, 'description' => $role->description, 'systemRole' => (bool) $role->system_role, 'permissions' => DB::table('role_permissions')->where('role_id', $role->id)->pluck('permission')->all(), 'memberCount' => DB::table('group_members')->where('role_id', $role->id)->where('active', true)->count()]));
    }

    public function createRole(Request $r)
    {
        return $this->saveRole($r);
    }

    public function updateRole(Request $r, int $id)
    {
        return $this->saveRole($r, $id);
    }

    public function permissions(Request $r)
    {
        $this->allow($r, 'ROLE_VIEW');

        return response()->json(collect($this->catalog)->map(fn ($labels, $code) => ['code' => $code, 'labelFr' => $labels[0], 'labelEn' => $labels[1], 'group' => $labels[2]])->values());
    }

    public function saveRole(Request $r, ?int $id = null)
    {
        $this->allow($r, $id ? 'ROLE_EDIT' : 'ROLE_CREATE');
        $g = $this->group($r);
        $d = $r->validate(['code' => 'required|string|max:40', 'name' => 'required|string|max:80', 'description' => 'nullable|string|max:255', 'permissions' => 'array', 'permissions.*' => 'string']);
        $values = ['code' => strtoupper($d['code']), 'name' => $d['name'], 'description' => $d['description'] ?? null];
        if ($id) {
            $roleExistsInGroup = DB::table('roles')->where(['id' => $id, 'group_id' => $g])->exists();
            abort_unless($roleExistsInGroup, 404, 'Rôle introuvable dans ce groupe');
            DB::table('roles')->where(['id' => $id, 'group_id' => $g])->update($values);
            $rid = $id;
            DB::table('role_permissions')->where('role_id', $rid)->delete();
        } else {
            $rid = DB::table('roles')->insertGetId($values + ['group_id' => $g, 'system_role' => false, 'created_at' => now()]);
        } foreach (array_intersect($d['permissions'] ?? [], array_keys($this->catalog)) as $p) {
            DB::table('role_permissions')->insert(['role_id' => $rid, 'permission' => $p]);
        }

        return response()->json(['id' => $rid, 'code' => $values['code'], 'name' => $values['name'], 'description' => $values['description'], 'systemRole' => false, 'permissions' => $d['permissions'] ?? [], 'memberCount' => 0]);
    }

    public function deleteRole(Request $r, int $id)
    {
        $this->allow($r, 'ROLE_DELETE');
        $role = DB::table('roles')->where(['id' => $id, 'group_id' => $this->group($r)])->first();
        if (! $role || $role->system_role || DB::table('group_members')->where('role_id', $id)->exists()) {
            abort(409, 'Rôle utilisé ou protégé');
        } DB::table('roles')->where('id', $id)->delete();

        return response()->json(['message' => 'Rôle supprimé']);
    }

    public function types(Request $r)
    {
        $this->allow($r, 'ASSISTANCE_TYPE_VIEW');
        $q = DB::table('assistance_types')->where('group_id', $this->group($r));
        if ($r->boolean('activeOnly')) {
            $q->where('active', true);
        }

        return response()->json($q->orderBy('name')->get()->map(fn ($t) => ['id' => (int) $t->id, 'name' => $t->name, 'description' => $t->description, 'icon' => $t->icon, 'active' => (bool) $t->active, 'createdAt' => $t->created_at, 'eventCount' => DB::table('events')->where('type_id', $t->id)->count()]));
    }

    public function createType(Request $r)
    {
        $this->allow($r, 'ASSISTANCE_TYPE_CREATE');
        $g = $this->group($r);
        $d = $r->validate(['name' => 'required|string|max:80', 'description' => 'nullable|string|max:400', 'icon' => 'nullable|string|max:16', 'active' => 'nullable|boolean']);
        $id = DB::table('assistance_types')->insertGetId(['group_id' => $g, 'name' => $d['name'], 'description' => $d['description'] ?? null, 'icon' => $d['icon'] ?? null, 'active' => $d['active'] ?? true, 'created_by' => $r->attributes->get('memberId'), 'created_at' => now()]);

        return response()->json(['id' => $id, 'name' => $d['name'], 'description' => $d['description'] ?? null, 'icon' => $d['icon'] ?? null, 'active' => $d['active'] ?? true, 'createdAt' => now(), 'eventCount' => 0], 201);
    }

    public function updateType(Request $r, int $id)
    {
        $this->allow($r, 'ASSISTANCE_TYPE_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['name' => 'required|string|max:80', 'description' => 'nullable|string|max:400', 'icon' => 'nullable|string|max:16', 'active' => 'nullable|boolean']);
        $updated = DB::table('assistance_types')->where(['id' => $id, 'group_id' => $g])->update(['name' => $d['name'], 'description' => $d['description'] ?? null, 'icon' => $d['icon'] ?? null, 'active' => $d['active'] ?? true]);
        abort_unless($updated, 404, 'Type d’assistance introuvable dans ce groupe');

        return response()->json(DB::table('assistance_types')->where(['id' => $id, 'group_id' => $g])->first());
    }

    public function deleteType(Request $r, int $id)
    {
        $this->allow($r, 'ASSISTANCE_TYPE_DELETE');
        DB::table('assistance_types')->where(['id' => $id, 'group_id' => $this->group($r)])->update(['active' => false]);

        return response()->json(['message' => 'Type désactivé']);
    }

    public function bureau(Request $r)
    {
        $this->allow($r, 'MEMBER_VIEW');
        $g = $this->group($r);
        $rows = DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->join('roles as role', 'role.id', '=', 'gm.role_id')->where('gm.group_id', $g)->where('gm.active', true)->where('m.active', true)->where(fn ($query) => $query->whereNotNull('gm.bureau_position')->orWhere('gm.is_principal_admin', true))->select('gm.*', 'gm.member_id as member_id', 'm.*', 'gm.role_id as role_id', 'gm.active as group_active', 'gm.cycle_contributions as group_cycle_contributions', 'gm.total_contributions as group_total_contributions', 'gm.required_assistances_override as group_required_assistances_override', 'gm.bureau_position as group_bureau_position', 'role.name', 'role.code')->orderBy('m.first_name')->get();

        return response()->json($rows->map(fn ($row) => $this->memberDto($row, $g)));
    }

    public function appointBureau(Request $r)
    {
        $this->allow($r, 'MEMBER_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['memberId' => 'required|integer', 'position' => 'required|string|max:50']);
        DB::table('group_members')->where(['group_id' => $g, 'member_id' => $d['memberId']])->update(['bureau_position' => $d['position']]);

        return response()->json(['message' => 'Membre nommé au bureau']);
    }

    public function updateBureauPosition(Request $r, int $memberId)
    {
        $this->allow($r, 'MEMBER_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['position' => 'required|string|in:'.implode(',', ['MEMBRE_BUREAU', 'DIRECTEUR', 'DIRECTEUR_ADJOINT', 'SECRETAIRE', 'SECRETAIRE_ADJOINT', 'TRESORIER', 'TRESORIER_ADJOINT', 'CONSEILLER', 'COMMISSAIRE_AUX_COMPTES'])]);
        $updated = DB::table('group_members')->where(['group_id' => $g, 'member_id' => $memberId, 'active' => true])->update(['bureau_position' => $d['position']]);
        abort_unless($updated, 404, 'Membre actif introuvable dans ce groupe');

        return response()->json(['message' => 'Fonction au bureau mise à jour']);
    }

    public function replaceBureau(Request $r)
    {
        $this->allow($r, 'MEMBER_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['currentMemberId' => 'required|integer', 'replacementMemberId' => 'required|integer']);
        $position = DB::table('group_members')->where(['group_id' => $g, 'member_id' => $d['currentMemberId']])->value('bureau_position');
        if (! $position) {
            abort(404);
        }DB::transaction(function () use ($g, $d, $position) {
            DB::table('group_members')->where(['group_id' => $g, 'member_id' => $d['currentMemberId']])->update(['bureau_position' => null]);
            DB::table('group_members')->where(['group_id' => $g, 'member_id' => $d['replacementMemberId']])->update(['bureau_position' => $position]);
        });

        return response()->json(['message' => 'Membre du bureau remplacé']);
    }

    public function removeBureau(Request $r, int $id)
    {
        $this->allow($r, 'MEMBER_EDIT');
        DB::table('group_members')->where(['group_id' => $this->group($r), 'member_id' => $id])->update(['bureau_position' => null]);

        return response()->noContent();
    }

    public function notifications(Request $r)
    {
        $g = $this->group($r);
        $rows = DB::table('app_notifications')->where(['recipient_id' => $r->attributes->get('memberId'), 'group_id' => $g])->orderByDesc('created_at')->limit(50)->get();

        return response()->json(['notifications' => $rows->map(fn ($n) => ['id' => (int) $n->id, 'type' => $n->notification_type, 'title' => $n->title, 'message' => $n->message, 'entityType' => $n->entity_type, 'entityId' => $n->entity_id, 'createdAt' => $n->created_at, 'readAt' => $n->read_at]), 'unreadCount' => $rows->whereNull('read_at')->count()]);
    }

    public function readNotification(Request $r, int $id)
    {
        DB::table('app_notifications')->where(['id' => $id, 'recipient_id' => $r->attributes->get('memberId'), 'group_id' => $this->group($r)])->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent();
    }

    public function readAllNotifications(Request $r)
    {
        DB::table('app_notifications')->where(['recipient_id' => $r->attributes->get('memberId'), 'group_id' => $this->group($r)])->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent();
    }

    public function dashboard(Request $r)
    {
        $this->allow($r, 'REPORT_VIEW');
        $g = $this->group($r);
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $key = now()->startOfMonth()->subMonths($i)->format('Y-m');
            $months[$key] = ['month' => $key, 'contributions' => 0, 'assistances' => 0];
        }foreach (DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where('e.group_id', $g)->where('c.status', 'VALIDATED')->selectRaw("to_char(c.validated_at,'YYYY-MM') as month, count(*) as total")->groupBy('month')->get() as $row) {
            if (isset($months[$row->month])) {
                $months[$row->month]['contributions'] = (int) $row->total;
            }
        }foreach (DB::table('events')->where('group_id', $g)->where('status', 'CLOSED')->selectRaw("to_char(closed_at,'YYYY-MM') as month,count(*) as total")->groupBy('month')->get() as $row) {
            if (isset($months[$row->month])) {
                $months[$row->month]['assistances'] = (int) $row->total;
            }
        }

        return response()->json(['members' => DB::table('group_members')->where(['group_id' => $g, 'active' => true])->count(), 'openEvents' => DB::table('events')->where(['group_id' => $g, 'status' => 'OPEN'])->count(), 'totalCollected' => (float) DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['e.group_id' => $g, 'c.status' => 'VALIDATED'])->sum('c.amount'), 'completedAssistances' => DB::table('events')->where(['group_id' => $g, 'status' => 'CLOSED'])->count(), 'pendingContributions' => DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['e.group_id' => $g, 'c.status' => 'PENDING'])->count(), 'monthlyContributions' => array_values($months), 'monthlyAssistances' => array_values($months)]);
    }

    public function mySummary(Request $r)
    {
        $g = $this->group($r);
        $id = $r->attributes->get('memberId');
        $member = DB::table('members')->where('id', $id)->first();
        $gm = DB::table('group_members')->where(['group_id' => $g, 'member_id' => $id])->first();
        $required = $gm?->required_assistances_override ?? DB::table('association_groups')->where('id', $g)->value('min_assistances_required');
        $cycle = (int) ($gm?->cycle_contributions ?? 0);
        $amount = (float) DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['e.group_id' => $g, 'c.member_id' => $id, 'c.status' => 'VALIDATED'])->sum('c.amount');
        $memberView = app(AuthController::class)->me($r)->getData(true);

        $pendingContributions = DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['e.group_id' => $g, 'c.member_id' => $id, 'c.status' => 'PENDING'])->count();

        return response()->json(['member' => $memberView, 'cycleContributions' => $cycle, 'requiredAssistances' => (int) $required, 'eligible' => $cycle >= $required, 'missingToEligibility' => max(0, $required - $cycle), 'totalContributions' => (int) ($gm?->total_contributions ?? 0), 'totalContributedAmount' => $amount, 'openEvents' => DB::table('events')->where(['group_id' => $g, 'status' => 'OPEN'])->count(), 'pendingContributions' => $pendingContributions, 'myRequests' => DB::table('assistance_requests')->where(['group_id' => $g, 'member_id' => $id, 'status' => 'PENDING'])->count()]);
    }

    public function audit(Request $r)
    {
        $this->allow($r, 'AUDIT_VIEW');
        $g = $this->group($r);
        $page = max(0, (int) $r->query('page', 0));
        $size = min(100, max(1, (int) $r->query('size', 20)));
        $q = DB::table('audit_logs')->where('group_id', $g);
        $total = (clone $q)->count();
        $content = $q->orderByDesc('created_at')->offset($page * $size)->limit($size)->get()->map(fn ($a) => (array) ['id' => (int) $a->id, 'actorId' => $a->actor_id, 'actorName' => $a->actor_name, 'action' => $a->action, 'entityType' => $a->entity_type, 'entityId' => $a->entity_id, 'details' => $a->details, 'createdAt' => $a->created_at]);

        return response()->json(['content' => $content, 'page' => $page, 'size' => $size, 'totalElements' => $total, 'totalPages' => (int) ceil($total / $size), 'last' => (($page + 1) * $size >= $total)]);
    }

    public function publicGroups()
    {
        return response()->json(DB::table('association_groups')->where('active', true)->orderBy('name')->get()->map(fn ($g) => $this->groupDto($g)));
    }

    public function publicSettings(Request $r)
    {
        $g = $r->query('groupId') ? DB::table('association_groups')->where('id', $r->query('groupId'))->first() : DB::table('association_groups')->where('active', true)->orderBy('id')->first();

        return response()->json(['orgName' => $g?->name ?? 'Makénéné Solidarité', 'logoUrl' => $g?->logo_url, 'primaryColor' => $g?->primary_color ?? '#264557', 'accentColor' => $g?->accent_color ?? '#F3856A', 'currency' => $g?->currency ?? 'FCFA', 'defaultLocale' => DB::table('app_settings')->where('setting_key', 'app.default.locale')->value('setting_value') ?? 'fr', 'minContributionAmount' => $g?->min_contribution_amount ?? 0]);
    }

    public function settings(Request $r)
    {
        $this->allow($r, 'SETTINGS_VIEW');
        $g = DB::table('association_groups')->where('id', $this->group($r))->first();
        $raw = DB::table('app_settings')->pluck('setting_value', 'setting_key')->all();

        return response()->json(['orgName' => $g->name, 'logoUrl' => $g->logo_url, 'primaryColor' => $g->primary_color, 'accentColor' => $g->accent_color, 'currency' => $g->currency, 'minContributionsRequired' => $g->min_assistances_required, 'minContributionAmount' => $g->min_contribution_amount, 'defaultLocale' => $raw['app.default.locale'] ?? 'fr', 'defaultTheme' => $raw['app.default.theme'] ?? 'light', 'defaultPassword' => '', 'contactPhone' => $g->contact_phone, 'contactEmail' => $g->contact_email, 'motto' => $raw['org.motto'] ?? '']);
    }

    public function permissionGroups(Request $r)
    {
        $settings = $this->settings($r)->getData(true);
        $groups = [];
        foreach ($this->catalog as $code => [$labelFr, $labelEn, $group]) {
            $groups[$group][] = ['code' => $code, 'labelFr' => $labelFr, 'labelEn' => $labelEn];
        }

        return response()->json(['settings' => $settings, 'permissionGroups' => $groups]);
    }

    public function updateSettings(Request $r)
    {
        $this->allow($r, 'SETTINGS_MANAGE');
        $g = $this->group($r);
        $d = $r->validate(['orgName' => 'required|string|max:120', 'logoUrl' => 'nullable|string|max:300', 'primaryColor' => 'required|string|max:20', 'accentColor' => 'required|string|max:20', 'currency' => 'required|string|max:20', 'minContributionsRequired' => 'required|integer|min:0', 'minContributionAmount' => 'nullable|numeric|min:0', 'contactPhone' => 'nullable|string|max:30', 'contactEmail' => 'nullable|email|max:120', 'motto' => 'nullable|string|max:255', 'defaultLocale' => 'nullable|in:fr,en', 'defaultTheme' => 'nullable|in:light,dark,system', 'defaultPassword' => 'nullable|string|max:1024']);
        DB::table('association_groups')->where('id', $g)->update(['name' => $d['orgName'], 'logo_url' => $d['logoUrl'] ?? null, 'primary_color' => $d['primaryColor'], 'accent_color' => $d['accentColor'], 'currency' => $d['currency'], 'min_assistances_required' => $d['minContributionsRequired'], 'min_contribution_amount' => $d['minContributionAmount'] ?? 0, 'contact_phone' => $d['contactPhone'] ?? null, 'contact_email' => $d['contactEmail'] ?? null]);
        if ($this->member($r)->super_admin) {
            foreach (['defaultLocale' => 'app.default.locale', 'defaultTheme' => 'app.default.theme'] as $k => $dbk) {
                if (isset($d[$k])) {
                    DB::table('app_settings')->updateOrInsert(['setting_key' => $dbk], ['setting_value' => $d[$k], 'updated_at' => now()]);
                }
            }
            if (isset($d['defaultPassword']) && $d['defaultPassword'] !== '') {
                $this->sensitiveSettings->setDefaultPassword($d['defaultPassword']);
            }
        }

        return $this->settings($r);
    }

    private function groupDto(object $g): array
    {
        return ['id' => (int) $g->id, 'name' => $g->name, 'logoUrl' => $g->logo_url, 'city' => $g->city, 'description' => $g->description, 'contactPhone' => $g->contact_phone, 'contactEmail' => $g->contact_email, 'primaryColor' => $g->primary_color, 'accentColor' => $g->accent_color, 'currency' => $g->currency, 'minAssistancesRequired' => (int) $g->min_assistances_required, 'principalAdmin' => false];
    }
}
