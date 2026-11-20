<?php

namespace Tests\Feature;

use App\Mail\MemberAccessCredentials;
use App\Models\AppSetting;
use App\Services\PasswordHashService;
use App\Services\SensitiveSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_blocked_after_six_failed_attempts(): void
    {
        for ($attempt = 1; $attempt <= 6; $attempt++) {
            $this->postJson('/api/auth/login', ['phone' => '600000001', 'password' => 'incorrect'])
                ->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['phone' => '600000001', 'password' => 'incorrect'])
            ->assertTooManyRequests()
            ->assertHeader('Retry-After');
    }

    public function test_login_requires_membership_in_the_group_selected_on_the_public_page(): void
    {
        [$groupId, $memberId] = $this->createGroupMember('Groupe demandé', '600000011');
        [$otherGroupId] = $this->createGroupMember('Autre groupe', '600000012');

        $this->postJson('/api/auth/login', [
            'phone' => '600000011',
            'password' => 'temporary password',
            'groupId' => $otherGroupId,
        ])->assertForbidden()->assertJsonPath('code', 'account_not_in_group');

        $this->postJson('/api/auth/login', [
            'phone' => '600000011',
            'password' => 'temporary password',
            'groupId' => $groupId,
        ])->assertOk()->assertJsonPath('member.groupId', $groupId);
    }

    public function test_new_member_credentials_are_emailed_when_smtp_is_configured(): void
    {
        config(['mail.default' => 'smtp']);
        Mail::fake();
        [$groupId, $adminId] = $this->createGroupMember('Groupe courriel', '600000021', ['MEMBER_CREATE']);
        $this->authenticateAs($adminId);

        $response = $this->withHeader('X-Group-Id', (string) $groupId)
            ->postJson('/api/members', [
                'firstName' => 'Aline',
                'lastName' => 'Manga',
                'phone' => '600000022',
                'city' => 'Makenene',
                'email' => 'aline@example.test',
            ])
            ->assertCreated()
            ->assertJsonPath('credentialsEmailQueued', true);

        $this->app->terminate();
        $this->assertArrayNotHasKey('temporaryPassword', $response->json());
        Mail::assertSent(MemberAccessCredentials::class, fn (MemberAccessCredentials $mail): bool => $mail->hasTo('aline@example.test')
            && $mail->identifier === '600000022'
            && $mail->groupName === 'Groupe courriel');
    }

    public function test_member_creation_rejects_an_email_already_owned_by_another_account(): void
    {
        [$groupId, $adminId] = $this->createGroupMember('Groupe e-mail unique', '600000023', ['MEMBER_CREATE']);
        DB::table('members')->where('id', $adminId)->update(['email' => 'shared@example.test']);
        $this->authenticateAs($adminId);

        $this->withHeader('X-Group-Id', (string) $groupId)
            ->postJson('/api/members', [
                'firstName' => 'Autre',
                'lastName' => 'Membre',
                'phone' => '600000024',
                'city' => 'Makenene',
                'email' => 'SHARED@example.test',
            ])
            ->assertStatus(409)
            ->assertJsonPath('code', 'conflict');

        $this->assertDatabaseMissing('members', ['phone' => '600000024']);
    }

    public function test_only_super_admin_can_create_a_group_and_the_new_admin_is_assigned_to_it(): void
    {
        [$existingGroupId, $superAdminId] = $this->createGroupMember('Groupe source', '600000031');
        DB::table('members')->where('id', $superAdminId)->update(['super_admin' => true]);
        config(['mail.default' => 'smtp']);
        Mail::fake();
        $this->authenticateAs($superAdminId);

        $this->withHeader('X-Group-Id', (string) $existingGroupId)
            ->postJson('/api/groups', [
                'name' => 'Nouveau groupe',
                'city' => 'Makenene',
                'admin' => [
                    'firstName' => 'Pauline',
                    'lastName' => 'Etoa',
                    'phone' => '600000032',
                    'email' => 'pauline@example.test',
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Nouveau groupe')
            ->assertJsonPath('credentialsEmailQueued', true);

        $this->app->terminate();
        $newGroupId = (int) DB::table('association_groups')->where('name', 'Nouveau groupe')->value('id');
        $adminId = (int) DB::table('members')->where('phone', '600000032')->value('id');
        $superAdminMembershipCount = DB::table('group_members')->where(['group_id' => $newGroupId, 'member_id' => $superAdminId, 'active' => true])->count();

        $this->assertSame(1, $superAdminMembershipCount);
        $this->assertDatabaseHas('group_members', ['group_id' => $newGroupId, 'member_id' => $adminId, 'is_principal_admin' => true]);
        Mail::assertSent(MemberAccessCredentials::class, fn (MemberAccessCredentials $mail): bool => $mail->hasTo('pauline@example.test')
            && $mail->identifier === '600000032'
            && $mail->groupName === 'Nouveau groupe');
    }

    public function test_regular_group_admin_cannot_create_a_new_group(): void
    {
        [$groupId, $memberId] = $this->createGroupMember('Groupe ordinaire', '600000041');
        $this->authenticateAs($memberId);

        $this->withHeader('X-Group-Id', (string) $groupId)
            ->postJson('/api/groups', [
                'name' => 'Groupe non autorisé',
                'admin' => ['firstName' => 'Nouveau', 'lastName' => 'Membre', 'phone' => '600000042'],
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('association_groups', ['name' => 'Groupe non autorisé']);
    }

    public function test_password_hash_supports_spaces_special_characters_and_long_passwords(): void
    {
        $passwords = app(PasswordHashService::class);
        $plainPassword = str_repeat('Très sûr ! ', 30);
        $hash = $passwords->make($plainPassword);

        $this->assertStringStartsWith('bcrypt-sha256:$2y$', $hash);
        $this->assertTrue($passwords->check($plainPassword, $hash));
        $this->assertFalse($passwords->check('Très sûr !', $hash));
        $this->assertFalse(str_contains($hash, $plainPassword));
    }

    public function test_legacy_bcrypt_hash_is_accepted_and_marked_for_upgrade(): void
    {
        $passwords = app(PasswordHashService::class);
        $legacyHash = password_hash('legacy password', PASSWORD_BCRYPT);

        $this->assertTrue($passwords->check('legacy password', $legacyHash));
        $this->assertTrue($passwords->needsRehash($legacyHash));
    }

    public function test_legacy_default_password_setting_is_encrypted_when_read(): void
    {
        AppSetting::query()->create([
            'setting_key' => 'org.default.password',
            'setting_value' => 'temporary secret with spaces',
            'updated_at' => now(),
        ]);

        $service = app(SensitiveSettingsService::class);

        $this->assertSame('temporary secret with spaces', $service->defaultPassword());
        $storedValue = AppSetting::query()->where('setting_key', 'org.default.password')->value('setting_value');
        $this->assertStringStartsWith('encrypted:v1:', $storedValue);
        $this->assertStringNotContainsString('temporary secret with spaces', $storedValue);
        $this->assertSame('temporary secret with spaces', $service->defaultPassword());
    }

    public function test_a_group_admin_cannot_reset_a_member_password_from_another_group(): void
    {
        [$groupA, $adminId] = $this->createGroupMember('Groupe A', '600000101', ['MEMBER_RESET_PASSWORD']);
        [$groupB, $targetId] = $this->createGroupMember('Groupe B', '600000102');
        $this->authenticateAs($adminId);

        $this->withHeader('X-Group-Id', (string) $groupA)
            ->postJson("/api/members/{$targetId}/reset-password")
            ->assertNotFound();

        $this->assertSame(1, DB::table('group_members')->where(['group_id' => $groupB, 'member_id' => $targetId])->count());
    }

    public function test_a_member_cannot_submit_a_request_using_another_groups_assistance_type(): void
    {
        [$groupA, $memberId] = $this->createGroupMember('Groupe A', '600000201', ['REQUEST_CREATE']);
        [$groupB] = $this->createGroupMember('Groupe B', '600000202');
        $typeId = DB::table('assistance_types')->insertGetId([
            'group_id' => $groupB,
            'name' => 'Type privé du groupe B',
            'created_at' => now(),
        ]);
        $this->authenticateAs($memberId);

        $this->withHeader('X-Group-Id', (string) $groupA)
            ->postJson('/api/requests', ['typeId' => $typeId, 'reason' => 'Demande test'])
            ->assertNotFound();

        $this->assertDatabaseCount('assistance_requests', 0);
    }

    public function test_archiving_a_member_returns_the_status_for_the_selected_group(): void
    {
        [$groupId, $adminId] = $this->createGroupMember('Groupe statut', '600000301', ['MEMBER_ARCHIVE']);
        [, $targetId] = $this->createGroupMember('Groupe membre', '600000302');
        DB::table('group_members')->insert([
            'group_id' => $groupId,
            'member_id' => $targetId,
            'role_id' => DB::table('roles')->where('group_id', $groupId)->value('id'),
            'joined_at' => now(),
        ]);
        $this->authenticateAs($adminId);

        $this->withHeader('X-Group-Id', (string) $groupId)
            ->putJson("/api/members/{$targetId}/status", ['active' => false])
            ->assertOk()
            ->assertJsonPath('active', false);

        $this->assertDatabaseHas('members', ['id' => $targetId, 'active' => true]);
    }

    public function test_a_regular_member_cannot_replace_a_group_logo(): void
    {
        Storage::fake('public');
        [$groupId, $memberId] = $this->createGroupMember('Groupe privé', '600000401', ['EVENT_VIEW']);
        $this->authenticateAs($memberId);

        $this->withHeader('X-Group-Id', (string) $groupId)
            ->post('/api/settings/logo', ['file' => UploadedFile::fake()->image('logo.png')])
            ->assertForbidden();

        $this->assertDatabaseHas('association_groups', ['id' => $groupId, 'logo_url' => null]);
    }

    public function test_editing_a_role_cannot_delete_permissions_in_another_group(): void
    {
        [$groupA, $adminId] = $this->createGroupMember('Groupe rôles A', '600000501', ['ROLE_EDIT']);
        [$groupB, $memberId] = $this->createGroupMember('Groupe rôles B', '600000502');
        $roleB = DB::table('group_members')->where(['group_id' => $groupB, 'member_id' => $memberId])->value('role_id');
        DB::table('role_permissions')->insert(['role_id' => $roleB, 'permission' => 'MEMBER_CREATE']);
        $this->authenticateAs($adminId);

        $this->withHeader('X-Group-Id', (string) $groupA)
            ->putJson("/api/roles/{$roleB}", ['code' => 'EDITED', 'name' => 'Edited', 'permissions' => ['EVENT_VIEW']])
            ->assertNotFound();

        $this->assertDatabaseHas('role_permissions', ['role_id' => $roleB, 'permission' => 'MEMBER_CREATE']);
    }

    public function test_editing_an_assistance_type_cannot_read_another_groups_type(): void
    {
        [$groupA, $adminId] = $this->createGroupMember('Groupe types A', '600000601', ['ASSISTANCE_TYPE_EDIT']);
        [$groupB] = $this->createGroupMember('Groupe types B', '600000602');
        $typeId = DB::table('assistance_types')->insertGetId([
            'group_id' => $groupB,
            'name' => 'Type privé',
            'created_at' => now(),
        ]);
        $this->authenticateAs($adminId);

        $this->withHeader('X-Group-Id', (string) $groupA)
            ->putJson("/api/assistance-types/{$typeId}", ['name' => 'Tentative', 'active' => true])
            ->assertNotFound();

        $this->assertDatabaseHas('assistance_types', ['id' => $typeId, 'group_id' => $groupB, 'name' => 'Type privé']);
    }

    public function test_group_member_without_contribution_permission_cannot_read_another_members_proof(): void
    {
        Storage::fake('local');
        [$groupId, $ownerId] = $this->createGroupMember('Groupe justificatifs', '600000701', ['CONTRIBUTION_SUBMIT']);
        [, $viewerId] = $this->createGroupMember('Groupe rôle lecteur', '600000702');
        $viewerRoleId = DB::table('roles')->insertGetId([
            'group_id' => $groupId,
            'code' => 'LECTEUR',
            'name' => 'Lecteur',
            'created_at' => now(),
        ]);
        DB::table('role_permissions')->insert(['role_id' => $viewerRoleId, 'permission' => 'EVENT_VIEW']);
        DB::table('group_members')->insert([
            'group_id' => $groupId,
            'member_id' => $viewerId,
            'role_id' => $viewerRoleId,
            'joined_at' => now(),
        ]);
        $typeId = DB::table('assistance_types')->insertGetId([
            'group_id' => $groupId,
            'name' => 'Assistance justificatif',
            'created_at' => now(),
        ]);
        $eventId = DB::table('events')->insertGetId([
            'group_id' => $groupId,
            'reference' => 'ASS-TEST-0001',
            'type_id' => $typeId,
            'beneficiary_id' => $ownerId,
            'description' => 'Événement de test',
            'created_at' => now(),
        ]);
        $filename = 'b47ba44d-cb0a-4e74-8759-65e20da043f2.jpg';
        $url = '/api/files/'.$filename;
        Storage::disk('local')->put('private-uploads/'.$filename, Crypt::encryptString('preuve privée'));
        DB::table('contributions')->insert([
            'event_id' => $eventId,
            'member_id' => $ownerId,
            'amount' => 500,
            'status' => 'PENDING',
            'proof_photo_url' => $url,
            'submitted_at' => now(),
        ]);
        $this->authenticateAs($viewerId);

        $this->withHeader('X-Group-Id', (string) $groupId)
            ->get($url)
            ->assertNotFound();
    }

    public function test_permissions_are_resolved_from_the_members_role_in_the_selected_group(): void
    {
        [$groupA, $memberId] = $this->createGroupMember('Groupe rôle A', '600000801', ['EVENT_VIEW']);
        [$groupB] = $this->createGroupMember('Groupe rôle B', '600000802');
        $roleB = DB::table('roles')->insertGetId([
            'group_id' => $groupB,
            'code' => 'GESTIONNAIRE',
            'name' => 'Gestionnaire',
            'created_at' => now(),
        ]);
        DB::table('role_permissions')->insert(['role_id' => $roleB, 'permission' => 'MEMBER_VIEW']);
        DB::table('group_members')->insert([
            'group_id' => $groupB,
            'member_id' => $memberId,
            'role_id' => $roleB,
            'joined_at' => now(),
        ]);
        $this->authenticateAs($memberId);

        $this->withHeader('X-Group-Id', (string) $groupA)
            ->getJson('/api/members')
            ->assertForbidden();
        $this->withHeader('X-Group-Id', (string) $groupB)
            ->getJson('/api/members')
            ->assertOk();
    }

    /** @param list<string> $permissions
     * @return array{int, int}
     */
    private function createGroupMember(string $groupName, string $phone, array $permissions = []): array
    {
        $groupId = DB::table('association_groups')->insertGetId(['name' => $groupName, 'created_at' => now()]);
        $roleId = DB::table('roles')->insertGetId([
            'group_id' => $groupId,
            'code' => 'TEST_ROLE',
            'name' => 'Rôle de test',
            'created_at' => now(),
        ]);
        $memberId = DB::table('members')->insertGetId([
            'last_name' => 'Test',
            'first_name' => 'Membre',
            'phone' => $phone,
            'city' => 'Makenene',
            'password_hash' => app(PasswordHashService::class)->make('temporary password'),
            'role_id' => $roleId,
            'created_at' => now(),
        ]);
        DB::table('group_members')->insert([
            'group_id' => $groupId,
            'member_id' => $memberId,
            'role_id' => $roleId,
            'joined_at' => now(),
        ]);

        foreach ($permissions as $permission) {
            DB::table('role_permissions')->insert(['role_id' => $roleId, 'permission' => $permission]);
        }

        return [$groupId, $memberId];
    }

    private function authenticateAs(int $memberId): void
    {
        $plainToken = 'multi-group-test-token';
        DB::table('app_api_tokens')->insert([
            'member_id' => $memberId,
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => now()->addHour(),
            'created_at' => now(),
        ]);
        $this->withHeader('Authorization', 'Bearer '.$plainToken);
    }
}
