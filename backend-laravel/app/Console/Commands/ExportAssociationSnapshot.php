<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ExportAssociationSnapshot extends Command
{
    protected $signature = 'app:export-association-snapshot';

    protected $description = 'Exports the current association data into an encrypted, versionable seed bundle.';

    private const TABLES = [
        'association_groups', 'roles', 'role_permissions', 'members', 'group_members',
        'assistance_types', 'events', 'contributions', 'assistance_requests',
        'app_settings', 'audit_logs', 'app_notifications',
    ];

    public function handle(): int
    {
        if (! extension_loaded('openssl')) {
            $this->error('L’extension PHP OpenSSL est requise pour chiffrer le fichier.');

            return self::FAILURE;
        }

        $privateDirectory = storage_path('app/private');
        if (! is_dir($privateDirectory) && ! mkdir($privateDirectory, 0700, true) && ! is_dir($privateDirectory)) {
            throw new RuntimeException('Impossible de créer le dossier local privé storage/app/private.');
        }

        $keyFile = $privateDirectory.DIRECTORY_SEPARATOR.'association-data-export-key.txt';
        $key = $this->readOrCreateKey($keyFile);
        $tables = [];
        foreach (self::TABLES as $table) {
            $tables[$table] = DB::table($table)->get()->map(fn ($row): array => (array) $row)->all();
        }

        foreach ($tables['members'] as &$member) {
            unset($member['password_hash']);
            $member['must_change_password'] = true;
            $member['last_login_at'] = null;
        }
        unset($member);

        $payload = json_encode([
            'format' => 'makenene-solidarite-encrypted-seed-v1',
            'exported_at_utc' => now('UTC')->toIso8601String(),
            'tables' => $tables,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        $nonce = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt($payload, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($ciphertext === false || strlen($tag) !== 16) {
            throw new RuntimeException('OpenSSL n’a pas pu chiffrer le snapshot.');
        }
        $bundle = json_encode([
            'algorithm' => 'aes-256-gcm',
            'nonce' => base64_encode($nonce),
            'tag' => base64_encode($tag),
            'ciphertext' => base64_encode($ciphertext),
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $bundleDirectory = database_path('seed-data');
        if (! is_dir($bundleDirectory) && ! mkdir($bundleDirectory, 0755, true) && ! is_dir($bundleDirectory)) {
            throw new RuntimeException('Impossible de créer le dossier database/seed-data.');
        }
        $bundlePath = $bundleDirectory.DIRECTORY_SEPARATOR.'current-association-data.enc';
        if (file_put_contents($bundlePath, $bundle, LOCK_EX) === false) {
            throw new RuntimeException('Impossible d’écrire le bundle chiffré.');
        }

        if (function_exists('sodium_memzero')) {
            sodium_memzero($key);
        }
        $this->info('Export chiffré créé : database/seed-data/current-association-data.enc');
        $this->line('Clé à partager par un canal privé : storage/app/private/association-data-export-key.txt');
        $this->line('Les mots de passe et les jetons de session ne sont pas exportés.');
        $this->line('Nombre de groupes : '.count($tables['association_groups']).' ; membres : '.count($tables['members']).'.');

        return self::SUCCESS;
    }

    private function readOrCreateKey(string $keyFile): string
    {
        $configured = trim((string) env('DATA_EXPORT_KEY', ''));
        $stored = is_file($keyFile) ? trim((string) file_get_contents($keyFile)) : '';
        $encoded = $configured !== '' ? $configured : $stored;
        if ($encoded === '') {
            $encoded = base64_encode(random_bytes(32));
        }
        if ($encoded !== $stored) {
            if (file_put_contents($keyFile, $encoded, LOCK_EX) === false) {
                throw new RuntimeException('Impossible de sauvegarder la clé dans storage/app/private.');
            }
            @chmod($keyFile, 0600);
        }

        $key = base64_decode($encoded, true);
        if ($key === false || strlen($key) !== 32) {
            throw new RuntimeException('DATA_EXPORT_KEY doit être une clé Base64 de 32 octets.');
        }

        return $key;
    }
}
