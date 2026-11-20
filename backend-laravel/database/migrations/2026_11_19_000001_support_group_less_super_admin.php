<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles') || ! Schema::hasTable('members')) {
            return;
        }

        $groupColumn = collect(Schema::getColumns('roles'))->firstWhere('name', 'group_id');
        if ($groupColumn && ! ($groupColumn['nullable'] ?? false)) {
            Schema::table('roles', function (Blueprint $table): void {
                $table->foreignId('group_id')->nullable()->change();
            });
        }

        // Seed the global role after any encrypted association snapshot has been
        // imported so its IDs cannot collide with the preserved role IDs.
    }

    public function down(): void
    {
        // Keep the nullable global role: it may be assigned to the only account
        // capable of creating the first association.
    }
};
