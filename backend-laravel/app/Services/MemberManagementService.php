<?php

namespace App\Services;

use App\Models\GroupMembership;
use App\Models\Member;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MemberManagementService
{
    public function __construct(
        private readonly PasswordHashService $passwords,
        private readonly SensitiveSettingsService $sensitiveSettings,
    ) {}

    /**
     * @return array{member: Member, temporaryPassword: string}
     */
    public function createForGroup(int $groupId, array $data): array
    {
        return DB::transaction(function () use ($groupId, $data): array {
            $role = Role::query()->where(['group_id' => $groupId, 'code' => 'MEMBRE'])->first()
                ?? Role::query()->where('group_id', $groupId)->orderBy('id')->first();
            if (! $role) {
                abort(409, 'Le groupe ne possède aucun rôle membre');
            }

            $defaultPassword = $this->sensitiveSettings->defaultPassword();
            $temporaryPassword = filled($data['password'] ?? null)
                ? $data['password']
                : ($defaultPassword ?: Str::random(14));

            $member = Member::query()->create([
                'last_name' => $data['lastName'],
                'first_name' => $data['firstName'],
                'phone' => trim($data['phone']),
                'city' => $data['city'],
                'quarter' => $data['quarter'] ?? null,
                'photo_url' => $data['photoUrl'] ?? null,
                'photo_shape' => $data['photoShape'] ?? 'CIRCLE',
                'email' => $data['email'] ?? null,
                'password_hash' => $this->passwords->make($temporaryPassword),
                'must_change_password' => true,
                'active' => true,
                'role_id' => $role->id,
                'cycle_contributions' => 0,
                'total_contributions' => 0,
            ]);

            GroupMembership::query()->create([
                'group_id' => $groupId,
                'member_id' => $member->id,
                'role_id' => $role->id,
                'is_principal_admin' => false,
                'active' => true,
                'cycle_contributions' => 0,
                'total_contributions' => 0,
                'required_assistances_override' => $data['requiredAssistancesOverride'] ?? null,
                'joined_at' => now(),
            ]);

            return ['member' => $member, 'temporaryPassword' => $temporaryPassword];
        });
    }

    /** @param array<string, mixed> $memberAttributes
     * @param  array<string, mixed>  $membershipAttributes
     */
    public function updateWithinGroup(int $memberId, int $groupId, array $memberAttributes, array $membershipAttributes): Member
    {
        return DB::transaction(function () use ($memberId, $groupId, $memberAttributes, $membershipAttributes): Member {
            $membership = GroupMembership::query()->where(['group_id' => $groupId, 'member_id' => $memberId])->first();
            if (! $membership) {
                abort(404);
            }

            $member = Member::query()->findOrFail($memberId);
            if ($memberAttributes !== []) {
                $member->forceFill($memberAttributes)->save();
            }
            if ($membershipAttributes !== []) {
                $membership->forceFill($membershipAttributes)->save();
            }

            return $member->refresh();
        });
    }
}
