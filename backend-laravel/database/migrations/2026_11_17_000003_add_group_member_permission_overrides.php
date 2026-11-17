<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('group_members') && ! Schema::hasColumn('group_members', 'permissions_override')) {
            Schema::table('group_members', function (Blueprint $table): void {
                $table->json('permissions_override')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('group_members') && Schema::hasColumn('group_members', 'permissions_override')) {
            Schema::table('group_members', fn (Blueprint $table) => $table->dropColumn('permissions_override'));
        }
    }
};
