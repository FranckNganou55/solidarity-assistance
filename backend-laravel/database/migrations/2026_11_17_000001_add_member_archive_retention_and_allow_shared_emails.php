<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('members')) {
            foreach (Schema::getIndexes('members') as $index) {
                $columns = array_map('strtolower', $index['columns'] ?? []);
                if (($index['unique'] ?? false) && in_array('email', $columns, true)) {
                    Schema::table('members', fn (Blueprint $table) => $table->dropUnique($index['name']));
                }
            }
        }

        if (Schema::hasTable('group_members') && ! Schema::hasColumn('group_members', 'archived_at')) {
            Schema::table('group_members', fn (Blueprint $table) => $table->timestampTz('archived_at')->nullable());
        }

        if (Schema::hasTable('group_members') && Schema::hasColumn('group_members', 'archived_at')) {
            // Start the five-month retention period from rollout for legacy archives.
            DB::table('group_members')->where('active', false)->whereNull('archived_at')->update(['archived_at' => now()]);
        }
    }

    public function down(): void
    {
        // Shared email addresses and existing archive timestamps cannot be safely reversed.
    }
};
