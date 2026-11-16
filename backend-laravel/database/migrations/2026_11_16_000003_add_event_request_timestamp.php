<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('events')) return;
        if (! Schema::hasColumn('events', 'requested_at')) {
            Schema::table('events', fn (Blueprint $table) => $table->timestampTz('requested_at')->nullable());
        }
        DB::table('events')->whereNull('requested_at')->update(['requested_at' => DB::raw('created_at')]);
    }

    public function down(): void {}
};
