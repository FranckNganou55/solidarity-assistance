<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('events')) return;
        Schema::table('events', function (Blueprint $table): void {
            if (! Schema::hasColumn('events', 'eligibility_overridden')) $table->boolean('eligibility_overridden')->default(false);
            if (! Schema::hasColumn('events', 'eligibility_override_by')) $table->unsignedBigInteger('eligibility_override_by')->nullable();
        });
    }

    public function down(): void {}
};
