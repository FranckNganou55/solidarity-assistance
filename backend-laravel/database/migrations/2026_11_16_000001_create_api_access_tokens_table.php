<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_api_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $table->char('token_hash', 64)->unique();
            $table->timestampTz('expires_at');
            $table->timestampTz('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Le jeton est une table additive du nouveau serveur. Aucune donnée métier
        // existante n'est supprimée par cette migration.
        Schema::dropIfExists('app_api_tokens');
    }
};
