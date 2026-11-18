<?php

namespace Database\Seeders;

use App\Services\PasswordHashService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Seeds fictional groups and members for a new installation.
 * No data is copied from the live association database.
 */
class DemoDataSeeder extends Seeder
{
    private const GROUPS = [
        [
            'name' => 'Association Solidarité Démo',
            'city' => 'Makénéné',
            'description' => 'Groupe fictif de démonstration.',
            'prefix' => 'A',
            'phone_prefix' => '699991',
        ],
        [
            'name' => 'Collectif Entraide Démo',
            'city' => 'Makénéné',
            'description' => 'Deuxième groupe fictif de démonstration.',
            'prefix' => 'B',
            'phone_prefix' => '699992',
        ],
    ];

    private const PRINCIPAL_ADMIN_PERMISSIONS = [
        'GROUP_VIEW', 'GROUP_MANAGE',
        'MEMBER_VIEW', 'MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_THRESHOLD_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE', 'MEMBER_RESET_PASSWORD',
        'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN',
        'ASSISTANCE_TYPE_VIEW', 'ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE',
        'EVENT_VIEW', 'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_CLOSE', 'EVENT_EDIT_CLOSED', 'EVENT_REOPEN', 'EVENT_CANCEL',
        'REQUEST_CREATE', 'REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'REQUEST_OVERRIDE_ELIGIBILITY',
        'CONTRIBUTION_SUBMIT', 'CONTRIBUTION_VIEW', 'CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT',
        'REPORT_VIEW', 'SETTINGS_VIEW', 'SETTINGS_MANAGE', 'AUDIT_VIEW',
    ];

    /** @var array<int, array{phone:string,password:string,group:string,role:string}> */
    private array $newCredentials = [];

    public function run(): void
    {
        if (! filter_var(env('SEED_DEMO_DATA', false), FILTER_VALIDATE_BOOL)) {
            $this->command?->warn('Jeu de démonstration ignoré. Définissez SEED_DEMO_DATA=true pour l’activer.');

            return;
        }

        $demoNames = array_column(self::GROUPS, 'name');
        $existingGroupCount = DB::table('association_groups')->count();
        $existingDemoGroupCount = DB::table('association_groups')->whereIn('name', $demoNames)->count();
        if ($existingGroupCount > 0 && ($existingGroupCount !== count($demoNames) || $existingDemoGroupCount !== count($demoNames))) {
            $this->command?->warn('Base déjà renseignée : les données de démonstration sont ignorées afin de préserver les groupes et membres existants.');

            return;
        }

        DB::transaction(function (): void {
            $groupIds = [];
            foreach (self::GROUPS as $group) {
                $now = now();
                DB::table('association_groups')->updateOrInsert(
                    ['name' => $group['name']],
                    [
                        'city' => $group['city'],
                        'description' => $group['description'],
                        'primary_color' => '#1E6F5C',
                        'accent_color' => '#2D9CDB',
                        'currency' => 'FCFA',
                        'min_assistances_required' => 2,
                        'min_contribution_amount' => 0,
                        'active' => true,
                        'created_at' => $now,
                    ],
                );
                $groupIds[$group['prefix']] = (int) DB::table('association_groups')->where('name', $group['name'])->value('id');
            }

            $rolesByGroup = [];
            foreach (self::GROUPS as $group) {
                $groupId = $groupIds[$group['prefix']];
                $rolesByGroup[$group['prefix']] = $this->seedRoles($groupId);
            }

            $this->seedGlobalSuperAdmin($rolesByGroup['A']['ADMIN_PRINCIPAL']);
            foreach (self::GROUPS as $group) {
                $this->seedGroupMembers($group, $groupIds[$group['prefix']], $rolesByGroup[$group['prefix']]);
            }
        });

        $this->writeCredentialsFile();
        $this->command?->info('Données fictives créées. Les accès générés sont dans storage/app/private/demo-credentials.txt (fichier ignoré par Git).');
    }

    private function seedRoles(int $groupId): array
    {
        $roles = [
            'MEMBRE' => ['name' => 'Membre', 'description' => 'Membre de démonstration'],
            'ADMIN_PRINCIPAL' => ['name' => 'Administrateur principal', 'description' => 'Gestion du groupe de démonstration'],
            'TRESORIER' => ['name' => 'Trésorier', 'description' => 'Vérification des cotisations de démonstration'],
        ];
        $ids = [];

        foreach ($roles as $code => $attributes) {
            DB::table('roles')->updateOrInsert(
                ['group_id' => $groupId, 'code' => $code],
                $attributes + ['system_role' => true, 'created_at' => now()],
            );
            $ids[$code] = (int) DB::table('roles')->where(['group_id' => $groupId, 'code' => $code])->value('id');
        }

        DB::table('role_permissions')->insertOrIgnore(array_map(
            fn (string $permission): array => ['role_id' => $ids['ADMIN_PRINCIPAL'], 'permission' => $permission],
            self::PRINCIPAL_ADMIN_PERMISSIONS,
        ));
        DB::table('role_permissions')->insertOrIgnore(array_map(
            fn (string $permission): array => ['role_id' => $ids['TRESORIER'], 'permission' => $permission],
            ['EVENT_VIEW', 'CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT'],
        ));
        DB::table('role_permissions')->insertOrIgnore(array_map(
            fn (string $permission): array => ['role_id' => $ids['MEMBRE'], 'permission' => $permission],
            ['EVENT_VIEW', 'REQUEST_CREATE', 'REQUEST_VIEW', 'CONTRIBUTION_SUBMIT', 'CONTRIBUTION_VIEW'],
        ));

        return $ids;
    }

    private function seedGlobalSuperAdmin(int $principalRoleId): void
    {
        $phone = '699990000';
        $memberId = $this->upsertDemoMember([
            'first_name' => 'Super administrateur',
            'last_name' => 'Démo',
            'phone' => $phone,
            'email' => 'super.admin@example.invalid',
            'role_id' => $principalRoleId,
        ], 'Tous les groupes');

        DB::table('members')->where('id', $memberId)->update(['super_admin' => true]);
    }

    private function seedGroupMembers(array $group, int $groupId, array $roles): void
    {
        $prefix = $group['prefix'];
        $adminId = $this->upsertDemoMember([
            'first_name' => 'Administrateur principal',
            'last_name' => 'Démo '.$prefix,
            'phone' => $group['phone_prefix'].'001',
            'email' => 'admin.'.$prefix.'@example.invalid',
            'role_id' => $roles['ADMIN_PRINCIPAL'],
        ], $group['name'], 'ADMIN_PRINCIPAL', 'ADMINISTRATEUR_PRINCIPAL');
        $this->linkMember($groupId, $adminId, $roles['ADMIN_PRINCIPAL'], true, 'ADMINISTRATEUR_PRINCIPAL');

        $treasurerId = $this->upsertDemoMember([
            'first_name' => 'Trésorier',
            'last_name' => 'Démo '.$prefix,
            'phone' => $group['phone_prefix'].'002',
            'email' => 'tresorier.'.$prefix.'@example.invalid',
            'role_id' => $roles['TRESORIER'],
        ], $group['name'], 'TRESORIER', 'TRESORIER');
        $this->linkMember($groupId, $treasurerId, $roles['TRESORIER'], false, 'TRESORIER');

        for ($number = 3; $number <= 7; $number++) {
            $memberId = $this->upsertDemoMember([
                'first_name' => 'Membre',
                'last_name' => 'Démo '.$prefix.sprintf('%02d', $number - 2),
                'phone' => $group['phone_prefix'].sprintf('%03d', $number),
                'email' => 'membre.'.$prefix.sprintf('%02d', $number - 2).'@example.invalid',
                'role_id' => $roles['MEMBRE'],
            ], $group['name']);
            $this->linkMember($groupId, $memberId, $roles['MEMBRE']);
        }

        $superAdminId = (int) DB::table('members')->where('phone', '699990000')->value('id');
        $this->linkMember($groupId, $superAdminId, $roles['MEMBRE']);
    }

    private function upsertDemoMember(array $member, string $groupName, string $roleCode = 'MEMBRE', ?string $bureauPosition = null): int
    {
        $existing = DB::table('members')->where('phone', $member['phone'])->first();
        $password = Str::random(40);
        $now = now();
        $attributes = [
            'first_name' => $member['first_name'],
            'last_name' => $member['last_name'],
            'city' => 'Makénéné',
            'quarter' => 'Quartier Démo',
            'photo_url' => null,
            'photo_shape' => 'CIRCLE',
            'email' => $member['email'],
            'must_change_password' => true,
            'active' => true,
            'super_admin' => false,
            'role_id' => $member['role_id'],
            'cycle_contributions' => 0,
            'total_contributions' => 0,
            'required_assistances_override' => null,
            'bureau_position' => $bureauPosition,
            'updated_at' => $now,
        ];

        if (! $existing) {
            $memberId = (int) DB::table('members')->insertGetId($attributes + [
                'phone' => $member['phone'],
                'password_hash' => app(PasswordHashService::class)->make($password),
                'created_at' => $now,
            ]);
            $this->newCredentials[] = ['phone' => $member['phone'], 'password' => $password, 'group' => $groupName, 'role' => $roleCode];

            return $memberId;
        }

        $memberId = (int) $existing->id;
        if ($existing->must_change_password) {
            DB::table('members')->where('id', $memberId)->update($attributes + [
                'password_hash' => app(PasswordHashService::class)->make($password),
            ]);
            $this->newCredentials[] = ['phone' => $member['phone'], 'password' => $password, 'group' => $groupName, 'role' => $roleCode];
        }

        return $memberId;
    }

    private function linkMember(int $groupId, int $memberId, int $roleId, bool $isPrincipalAdmin = false, ?string $position = null): void
    {
        DB::table('group_members')->updateOrInsert(
            ['group_id' => $groupId, 'member_id' => $memberId],
            [
                'role_id' => $roleId,
                'is_principal_admin' => $isPrincipalAdmin,
                'active' => true,
                'cycle_contributions' => 0,
                'total_contributions' => 0,
                'required_assistances_override' => null,
                'bureau_position' => $position,
                'permissions_override' => null,
                'joined_at' => now(),
            ],
        );
    }

    private function writeCredentialsFile(): void
    {
        if ($this->newCredentials === []) {
            return;
        }

        $path = storage_path('app/private/demo-credentials.txt');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }

        $contents = "ACCÈS GÉNÉRÉS POUR LES DONNÉES FICTIVES — À CHANGER À LA PREMIÈRE CONNEXION\n";
        $contents .= "Ne versionnez ni ne partagez ce fichier.\n\n";
        foreach ($this->newCredentials as $credential) {
            $contents .= "Groupe : {$credential['group']}\nRôle : {$credential['role']}\nIdentifiant : {$credential['phone']}\nMot de passe temporaire : {$credential['password']}\n\n";
        }

        file_put_contents($path, $contents, LOCK_EX);
        @chmod($path, 0600);
    }
}
