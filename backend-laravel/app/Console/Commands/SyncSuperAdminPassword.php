<?php

namespace App\Console\Commands;

use App\Services\PasswordHashService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncSuperAdminPassword extends Command
{
    protected $signature = 'app:sync-super-admin-password';

    protected $description = 'Applique le mot de passe initial configuré en privé aux comptes super administrateur.';

    public function handle(PasswordHashService $passwords): int
    {
        $password = (string) env('SUPER_ADMIN_INITIAL_PASSWORD', '');
        if ($password === '') {
            $this->error('SUPER_ADMIN_INITIAL_PASSWORD doit être configuré dans .env.');

            return self::FAILURE;
        }

        $count = DB::table('members')->where('super_admin', true)->update([
            'password_hash' => $passwords->make($password),
            'must_change_password' => false,
            'updated_at' => now(),
        ]);
        if ($count < 1) {
            $this->error('Aucun compte super administrateur trouvé. Exécutez d’abord les migrations et seeders.');

            return self::FAILURE;
        }

        $this->info('Mot de passe super administrateur enregistré sous forme bcrypt.');

        return self::SUCCESS;
    }
}
