<?php

namespace Database\Seeders;

use App\Services\PasswordHashService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AssociationSnapshotSeeder extends Seeder
{
    private const TABLES = [
        'association_groups', 'roles', 'role_permissions', 'members', 'group_members',
        'assistance_types', 'events', 'contributions', 'assistance_requests',
        'app_settings', 'audit_logs', 'app_notifications',
    ];

    /** @var array<int, array{phone:string,password:string,name:string}> */
    private array $temporaryCredentials = [];

    public function run(): void
    {
        $bundlePath = database_path('seed-data/current-association-data.enc');
        if (! is_file($bundlePath)) {
            $this->command?->warn('Le bundle de données chiffré n’est pas présent.');

            return;
        }

        if (DB::table('association_groups')->exists() || DB::table('members')->exists()) {
            $this->command?->warn('Base déjà renseignée : l’import du snapshot est ignoré pour préserver les données existantes.');

            return;
        }

        $tables = $this->decryptBundle($bundlePath);
        DB::transaction(function () use ($tables): void {
            $passwords = app(PasswordHashService::class);
            foreach (self::TABLES as $table) {
                $rows = $tables[$table] ?? [];
                foreach ($rows as &$row) {
                    if ($table === 'members') {
                        $password = Str::random(48);
                        $row['password_hash'] = $passwords->make($password);
                        $row['must_change_password'] = true;
                        $row['last_login_at'] = null;
                        if ((bool) ($row['active'] ?? false)) {
                            $this->temporaryCredentials[] = [
                                'phone' => (string) $row['phone'],
                                'password' => $password,
                                'name' => trim(($row['first_name'] ?? '').' '.($row['last_name'] ?? '')),
                            ];
                        }
                    }
                }
                unset($row);

                foreach (array_chunk($rows, 250) as $batch) {
                    if ($batch !== []) {
                        DB::table($table)->insert($batch);
                    }
                }
            }
        });

        $this->writeCredentialsFile();
        $this->command?->info('Snapshot chiffré importé : '.count($tables['association_groups'] ?? []).' groupe(s), '.count($tables['members'] ?? []).' membre(s).');
        $this->command?->info('Les membres actifs doivent récupérer leurs mots de passe temporaires dans storage/app/private/imported-member-credentials.txt.');
    }

    private function decryptBundle(string $bundlePath): array
    {
        if (! extension_loaded('openssl')) {
            throw new RuntimeException('L’extension PHP OpenSSL est requise pour lire le snapshot chiffré.');
        }

        $keyFile = storage_path('app/private/association-data-export-key.txt');
        $encodedKey = trim((string) env('DATA_EXPORT_KEY', ''));
        if ($encodedKey === '' && is_file($keyFile)) {
            $encodedKey = trim((string) file_get_contents($keyFile));
        }
        $key = base64_decode($encodedKey, true);
        if ($key === false || strlen($key) !== 32) {
            throw new RuntimeException('Copiez la clé d’export dans storage/app/private/association-data-export-key.txt ou configurez DATA_EXPORT_KEY dans .env.');
        }

        $plaintext = null;
        try {
            $envelope = json_decode((string) file_get_contents($bundlePath), true, 512, JSON_THROW_ON_ERROR);
            if (($envelope['algorithm'] ?? null) !== 'aes-256-gcm') {
                throw new RuntimeException('Algorithme du snapshot inconnu.');
            }
            $nonce = base64_decode((string) ($envelope['nonce'] ?? ''), true);
            $tag = base64_decode((string) ($envelope['tag'] ?? ''), true);
            $ciphertext = base64_decode((string) ($envelope['ciphertext'] ?? ''), true);
            if ($nonce === false || strlen($nonce) !== 12 || $tag === false || strlen($tag) !== 16 || $ciphertext === false) {
                throw new RuntimeException('Format du snapshot chiffré invalide.');
            }

            $plaintext = openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag);
            if ($plaintext === false) {
                throw new RuntimeException('Clé invalide ou snapshot chiffré altéré.');
            }

            $payload = json_decode($plaintext, true, 512, JSON_THROW_ON_ERROR);
            if (($payload['format'] ?? null) !== 'makenene-solidarite-encrypted-seed-v1' || ! is_array($payload['tables'] ?? null)) {
                throw new RuntimeException('Contenu du snapshot non reconnu.');
            }

            foreach (self::TABLES as $table) {
                if (! is_array($payload['tables'][$table] ?? null)) {
                    throw new RuntimeException("Table absente du snapshot : {$table}.");
                }
            }

            return $payload['tables'];
        } finally {
            if (function_exists('sodium_memzero')) {
                sodium_memzero($key);
            }
            if (isset($plaintext) && is_string($plaintext)) {
                sodium_memzero($plaintext);
            }
        }
    }

    private function writeCredentialsFile(): void
    {
        if ($this->temporaryCredentials === []) {
            return;
        }

        $path = storage_path('app/private/imported-member-credentials.txt');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }

        $contents = "ACCÈS TEMPORAIRES APRÈS IMPORT — À CHANGER À LA PREMIÈRE CONNEXION\n";
        $contents .= "Ne versionnez ni ne partagez ce fichier.\n\n";
        foreach ($this->temporaryCredentials as $credential) {
            $contents .= "Membre : {$credential['name']}\nIdentifiant : {$credential['phone']}\nMot de passe temporaire : {$credential['password']}\n\n";
        }

        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('Import effectué, mais impossible d’écrire les nouveaux mots de passe temporaires.');
        }
        @chmod($path, 0600);
    }
}
