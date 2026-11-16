<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('association_groups') && ! Schema::hasColumn('association_groups', 'min_contribution_amount')) {
            Schema::table('association_groups', fn (Blueprint $table) => $table->decimal('min_contribution_amount', 14, 2)->default(0));
        }
    }

    public function down(): void {}
};
