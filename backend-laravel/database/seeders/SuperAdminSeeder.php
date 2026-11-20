<?php

namespace Database\Seeders;

use App\Services\PasswordHashService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $roleId = DB::table('roles')->whereNull('group_id')->where('code', 'SUPER_ADMIN')->value('id');
        if (! $roleId) {
            $roleId = DB::table('roles')->insertGetId([
                'group_id' => null,
                'code' => 'SUPER_ADMIN',
                'name' => 'Super administrateur',
                'description' => 'Administration globale, y compris avant la création du premier groupe.',
                'system_role' => true,
                'created_at' => now(),
            ]);
        }

        $existingAdmins = DB::table('members')->where('super_admin', true)->get(['id', 'role_id', 'must_change_password']);
        if ($existingAdmins->isNotEmpty()) {
            $configuredPassword = trim((string) env('SUPER_ADMIN_INITIAL_PASSWORD', ''));
            foreach ($existingAdmins as $admin) {
                $updates = [];
                if ((int) $admin->role_id !== (int) $roleId) {
                    $updates['role_id'] = $roleId;
                }
                // Apply the private bootstrap password once, while the account
                // is still flagged for its first password change.
                if ($configuredPassword !== '' && (bool) $admin->must_change_password) {
                    $updates['password_hash'] = app(PasswordHashService::class)->make($configuredPassword);
                    $updates['must_change_password'] = false;
                }
                if ($updates !== []) {
                    DB::table('members')->where('id', $admin->id)->update($updates);
                }
            }

            return;
        }

        $phone = trim((string) env('SUPER_ADMIN_IDENTIFIER', ''));
        if ($phone === '') {
            do {
                $phone = (string) random_int(600000000, 699999999);
            } while (DB::table('members')->where('phone', $phone)->exists());
        } elseif (DB::table('members')->where('phone', $phone)->exists()) {
            throw new RuntimeException('SUPER_ADMIN_IDENTIFIER est déjà utilisé par un autre compte.');
        }

        // Set privately in .env when provisioning multiple installations with
        // the same initial account. Never put this value in source control.
        $configuredPassword = trim((string) env('SUPER_ADMIN_INITIAL_PASSWORD', ''));
        $password = $configuredPassword !== '' ? $configuredPassword : Str::random(48);
        $memberId = DB::table('members')->insertGetId([
            'first_name' => trim((string) env('SUPER_ADMIN_FIRST_NAME', 'Super administrateur')),
            'last_name' => trim((string) env('SUPER_ADMIN_LAST_NAME', 'Application')),
            'phone' => $phone,
            'city' => trim((string) env('SUPER_ADMIN_CITY', 'Makénéné')),
            'quarter' => null,
            'photo_url' => null,
            'photo_shape' => 'CIRCLE',
            'email' => null,
            'password_hash' => app(PasswordHashService::class)->make($password),
            'must_change_password' => $configuredPassword === '',
            'active' => true,
            'super_admin' => true,
            'role_id' => $roleId,
            'cycle_contributions' => 0,
            'total_contributions' => 0,
            'required_assistances_override' => null,
            'bureau_position' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->writeCredentialFile($memberId, $phone, $password);
        $this->command?->info('Compte super administrateur initialisé. Ses accès temporaires sont dans storage/app/private/super-admin-credentials.txt.');
    }

    private function writeCredentialFile(int $memberId, string $phone, string $password): void
    {
        $path = storage_path('app/private/super-admin-credentials.txt');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }

        $contents = "ACCÈS TEMPORAIRES DU SUPER ADMINISTRATEUR — À CHANGER À LA PREMIÈRE CONNEXION\n";
        $contents .= "Compte créé pour l'installation locale, numéro interne {$memberId}.\n";
        $contents .= "Identifiant : {$phone}\nMot de passe temporaire : {$password}\n";
        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('Impossible d’écrire les accès temporaires dans storage/app/private.');
        }

        @chmod($path, 0600);
    }
}
