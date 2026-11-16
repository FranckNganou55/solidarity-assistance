<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('members') && ! Schema::hasColumn('members', 'photo_shape')) Schema::table('members', fn (Blueprint $table) => $table->string('photo_shape', 10)->default('CIRCLE'));
        if (Schema::hasTable('assistance_requests') && ! Schema::hasColumn('assistance_requests', 'document_url')) Schema::table('assistance_requests', fn (Blueprint $table) => $table->string('document_url', 300)->nullable());
        if (Schema::hasTable('events') && ! Schema::hasColumn('events', 'supporting_document_url')) Schema::table('events', fn (Blueprint $table) => $table->string('supporting_document_url', 300)->nullable());
        if (Schema::hasTable('contributions')) Schema::table('contributions', function (Blueprint $table): void {
            if (! Schema::hasColumn('contributions', 'proof_photo_url')) $table->string('proof_photo_url', 300)->nullable();
            if (! Schema::hasColumn('contributions', 'proof_photo_shape')) $table->string('proof_photo_shape', 10)->default('SQUARE');
        });
    }

    public function down(): void {}
};
