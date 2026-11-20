<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\LoginRequest;
use App\Models\ApiToken;
use App\Models\AssociationGroup;
use App\Models\Member;
use App\Services\PasswordHashService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AuthController
{
    public function __construct(private readonly PasswordHashService $passwords) {}

    public function login(LoginRequest $request)
    {
        $data = $request->validated();
        $rateLimitKey = 'auth-login:'.hash('sha256', mb_strtolower(trim($data['phone'])).'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($rateLimitKey, 6)) {
            return response()->json(['code' => 'too_many_attempts', 'message' => 'Trop de tentatives. Réessayez dans 15 minutes.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($rateLimitKey));
        }

        $member = Member::query()->where('phone', trim($data['phone']))->first();
        $storedPasswordHash = (string) ($member?->password_hash ?? '');
        if (! $member || ! $this->passwords->check($data['password'], $storedPasswordHash)) {
            RateLimiter::hit($rateLimitKey, 900);

            return response()->json(['code' => 'unauthorized', 'message' => 'Identifiant ou mot de passe incorrect'], 401);
        }
        RateLimiter::clear($rateLimitKey);
        if ($this->passwords->needsRehash($storedPasswordHash)) {
            $member->forceFill(['password_hash' => $this->passwords->make($data['password'])])->save();
        }
        if (! $member->active) {
            return response()->json(['code' => 'forbidden', 'message' => 'Compte archivé'], 403);
        }
        $memberships = DB::table('group_members as gm')
            ->join('association_groups as ag', 'ag.id', '=', 'gm.group_id')
            ->where(['gm.member_id' => $member->id, 'gm.active' => true, 'ag.active' => true]);
        $requestedGroupId = isset($data['groupId']) ? (int) $data['groupId'] : null;
        // A global administrator may sign in without choosing an association.
        // Start in the oldest active group and ensure there is a membership row
        // so the same account is represented consistently in group screens.
        if ($member->super_admin && ! $requestedGroupId) {
            $requestedGroupId = (int) DB::table('association_groups')->where('active', true)->orderBy('id')->value('id');
            if ($requestedGroupId > 0) {
                $memberRoleId = DB::table('roles')->where(['group_id' => $requestedGroupId, 'code' => 'MEMBRE'])->value('id');
                if ($memberRoleId) {
                    DB::table('group_members')->insertOrIgnore([
                        'group_id' => $requestedGroupId,
                        'member_id' => $member->id,
                        'role_id' => $memberRoleId,
                        'is_principal_admin' => false,
                        'active' => (bool) $member->active,
                        'cycle_contributions' => 0,
                        'total_contributions' => 0,
                        'joined_at' => now(),
                    ]);
                }
            }
        }
        if ($member->super_admin && $requestedGroupId) {
            $memberRoleId = DB::table('roles')->where(['group_id' => $requestedGroupId, 'code' => 'MEMBRE'])->value('id');
            if ($memberRoleId && DB::table('association_groups')->where(['id' => $requestedGroupId, 'active' => true])->exists()) {
                DB::table('group_members')->insertOrIgnore([
                    'group_id' => $requestedGroupId,
                    'member_id' => $member->id,
                    'role_id' => $memberRoleId,
                    'is_principal_admin' => false,
                    'active' => (bool) $member->active,
                    'cycle_contributions' => 0,
                    'total_contributions' => 0,
                    'joined_at' => now(),
                ]);
            }
        }
        if ($requestedGroupId) {
            $memberships->where('gm.group_id', $requestedGroupId);
        } else {
            $memberships->orderByDesc('gm.is_principal_admin')->orderBy('gm.group_id');
        }
        $group = $memberships->select('gm.group_id')->first();
        $firstGroupSetup = ! $group
            && $member->super_admin
            && ! $requestedGroupId
            && ! DB::table('association_groups')->where('active', true)->exists();
        if (! $group && ! $firstGroupSetup) {
            return response()->json([
                'code' => $requestedGroupId ? 'account_not_in_group' : 'no_active_group',
                'message' => $requestedGroupId
                    ? 'Ce compte n’appartient pas à ce groupe actif.'
                    : 'Aucun groupe actif n’est associé à ce compte.',
            ], 403);
        }
        $plain = Str::random(72);
        ApiToken::query()->create(['member_id' => $member->id, 'token_hash' => hash('sha256', $plain), 'expires_at' => now()->addHours(12), 'created_at' => now()]);
        $member->forceFill(['last_login_at' => now()])->save();
        $request->attributes->set('memberId', (int) $member->id);
        $request->attributes->set('member', $member);
        $request->attributes->set('groupId', (int) ($group?->group_id ?? 0));

        return response()->json(['token' => $plain, 'expiresIn' => 43200, 'mustChangePassword' => (bool) $member->must_change_password, 'member' => $this->memberView($member->id, $group?->group_id)]);
    }

    public function me(Request $request)
    {
        return response()->json($this->memberView($request->attributes->get('memberId'), $this->groupId($request)));
    }

    public function updateProfilePhoto(Request $request): JsonResponse
    {
        $data = $request->validate([
            'photoUrl' => ['sometimes', 'nullable', 'string', 'max:300'],
            'photoShape' => ['sometimes', 'in:CIRCLE,SQUARE'],
        ]);
        $memberId = (int) $request->attributes->get('memberId');
        $member = Member::query()->findOrFail($memberId);
        $updates = [];
        if (array_key_exists('photoUrl', $data)) {
            $updates['photo_url'] = $data['photoUrl'];
        }
        if (array_key_exists('photoShape', $data)) {
            $updates['photo_shape'] = $data['photoShape'];
        }
        $member->forceFill($updates)->save();

        return response()->json($this->memberView($memberId, $this->groupId($request)));
    }

    public function groups(Request $request)
    {
        $member = $request->attributes->get('member');
        $query = AssociationGroup::query()->where('active', true);
        if (! $member->super_admin) {
            $query->whereHas('members', fn ($members) => $members->where('members.id', $member->id)->where('group_members.active', true));
        }

        return response()->json($query->orderBy('name')->get()->map(fn ($g) => $this->groupView($g, $member->id)));
    }

    public function changePassword(Request $request)
    {
        $data = $request->validate([
            'currentPassword' => ['required', 'string', 'max:1024'],
            'newPassword' => ['required', 'string', 'confirmed', Password::min(12)->max(1024)->uncompromised()],
        ]);
        $id = $request->attributes->get('memberId');
        $member = Member::query()->findOrFail($id);
        if (! $this->passwords->check($data['currentPassword'], $member->password_hash)) {
            return response()->json(['code' => 'bad_request', 'message' => 'Le mot de passe actuel est incorrect'], 400);
        }
        $member->forceFill(['password_hash' => $this->passwords->make($data['newPassword']), 'must_change_password' => false, 'updated_at' => now()])->save();

        return response()->json(['message' => 'Mot de passe modifié']);
    }

    public function logout(Request $request)
    {
        $plain = preg_replace('/^Bearer\s+/i', '', (string) $request->header('Authorization'));
        if ($plain) {
            ApiToken::query()->where('token_hash', hash('sha256', $plain))->delete();
        }

        return response()->noContent();
    }

    public function refresh(Request $request)
    {
        $plain = preg_replace('/^Bearer\\s+/i', '', (string) $request->header('Authorization'));
        $memberId = (int) $request->attributes->get('memberId');
        $groupId = $this->groupId($request);
        $next = Str::random(72);

        DB::transaction(function () use ($plain, $memberId, $next): void {
            ApiToken::query()->where('token_hash', hash('sha256', (string) $plain))->delete();
            ApiToken::query()->create(['member_id' => $memberId, 'token_hash' => hash('sha256', $next), 'expires_at' => now()->addHours(12), 'created_at' => now()]);
        });

        $member = Member::query()->findOrFail($memberId);

        return response()->json(['token' => $next, 'expiresIn' => 43200, 'mustChangePassword' => (bool) $member->must_change_password, 'member' => $this->memberView($memberId, $groupId)]);
    }

    private function groupId(Request $r): ?int
    {
        $id = (int) ($r->header('X-Group-Id') ?: 0);
        if (! $id) {
            return null;
        }
        $member = $r->attributes->get('member');
        if (! $member->super_admin && ! DB::table('group_members')->where(['member_id' => $member->id, 'group_id' => $id, 'active' => true])->exists()) {
            abort(403);
        }

        return $id;
    }

    private function memberView(int $id, ?int $groupId): array
    {
        $m = Member::query()->findOrFail($id);
        $gm = $groupId ? DB::table('group_members as gm')->join('roles as r', 'r.id', '=', 'gm.role_id')->where(['gm.member_id' => $id, 'gm.group_id' => $groupId])->select('gm.*', 'r.name as role_name', 'r.code as role_code')->first() : null;
        $role = $gm ? null : DB::table('roles')->where('id', $m->role_id)->first();
        $required = $gm?->required_assistances_override ?? $m->required_assistances_override ?? ($groupId ? DB::table('association_groups')->where('id', $groupId)->value('min_assistances_required') : 0);
        $cycle = (int) ($gm?->cycle_contributions ?? $m->cycle_contributions);
        if ($m->super_admin) {
            $perms = DB::table('role_permissions')->pluck('permission')->unique()->values()->all();
        } elseif ($gm?->permissions_override !== null) {
            $perms = is_array($gm->permissions_override) ? $gm->permissions_override : (json_decode((string) $gm->permissions_override, true) ?: []);
        } else {
            $perms = DB::table('role_permissions')->where('role_id', $gm?->role_id ?? $m->role_id)->pluck('permission')->all();
        }
        if ($m->super_admin) {
            $perms[] = 'GROUP_CREATE';
        }

        return ['id' => (int) $m->id, 'groupId' => $groupId ? (int) $groupId : null, 'lastName' => $m->last_name, 'firstName' => $m->first_name, 'fullName' => trim($m->first_name.' '.$m->last_name), 'phone' => $m->phone, 'city' => $m->city, 'quarter' => $m->quarter, 'photoUrl' => $m->photo_url, 'email' => $m->email, 'active' => (bool) ($gm?->active ?? $m->active), 'roleId' => (int) ($gm?->role_id ?? $m->role_id), 'roleCode' => $gm?->role_code ?? $role?->code, 'roleName' => $gm?->role_name ?? $role?->name, 'superAdmin' => (bool) $m->super_admin, 'groupAdmin' => (bool) ($gm?->is_principal_admin ?? false), 'mustChangePassword' => (bool) $m->must_change_password, 'cycleContributions' => $cycle, 'totalContributions' => (int) ($gm?->total_contributions ?? $m->total_contributions), 'requiredAssistances' => (int) $required, 'requiredAssistancesOverride' => $gm?->required_assistances_override, 'bureauPosition' => $gm?->bureau_position ?? $m->bureau_position, 'eligibleForAssistance' => $cycle >= (int) $required, 'createdAt' => $m->created_at, 'lastLoginAt' => $m->last_login_at, 'permissions' => array_values(array_unique($perms)), 'photoShape' => $m->photo_shape ?? 'CIRCLE'];
    }

    private function groupView(object $g, int $memberId): array
    {
        $membership = DB::table('group_members as gm')->join('roles as r', 'r.id', '=', 'gm.role_id')->where(['gm.group_id' => $g->id, 'gm.member_id' => $memberId])->first();

        return ['id' => (int) $g->id, 'name' => $g->name, 'logoUrl' => $g->logo_url, 'city' => $g->city, 'description' => $g->description, 'contactPhone' => $g->contact_phone, 'contactEmail' => $g->contact_email, 'primaryColor' => $g->primary_color, 'accentColor' => $g->accent_color, 'currency' => $g->currency, 'minAssistancesRequired' => (int) $g->min_assistances_required, 'principalAdmin' => (bool) ($membership?->is_principal_admin ?? false), 'roleName' => $membership?->name];
    }
}
