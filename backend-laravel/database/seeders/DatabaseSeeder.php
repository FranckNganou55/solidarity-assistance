<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $hasEncryptedSnapshot = is_file(database_path('seed-data/current-association-data.enc'));
        $hasSnapshotKey = trim((string) env('DATA_EXPORT_KEY', '')) !== ''
            || is_file(storage_path('app/private/association-data-export-key.txt'));
        if ($hasEncryptedSnapshot && $hasSnapshotKey) {
            $this->call(AssociationSnapshotSeeder::class);
        } elseif ($hasEncryptedSnapshot) {
            $this->command?->warn('Clé privée absente : le snapshot chiffré n’est pas importé. Le super administrateur global reste initialisé sans groupe.');
        }

        $this->call(SuperAdminSeeder::class);
    }
}
