<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('members') && ! Schema::hasColumn('members', 'bureau_position')) {
            Schema::table('members', fn (Blueprint $table) => $table->string('bureau_position', 50)->nullable());
        }
        if (! Schema::hasTable('app_notifications')) {
            Schema::create('app_notifications', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('recipient_id')->constrained('members')->cascadeOnDelete();
                $table->string('notification_type', 40);
                $table->string('title', 160);
                $table->string('message', 500);
                $table->string('entity_type', 40)->nullable();
                $table->unsignedBigInteger('entity_id')->nullable();
                $table->timestampTz('created_at')->useCurrent();
                $table->timestampTz('read_at')->nullable();
                $table->index(['recipient_id', 'created_at'], 'idx_app_notifications_recipient_created');
            });
        }
    }

    public function down(): void {}
};
