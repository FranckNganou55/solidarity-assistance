<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('events') || ! Schema::hasTable('assistance_requests') || ! Schema::hasColumn('events', 'requested_at') || ! Schema::hasColumn('assistance_requests', 'event_id')) {
            return;
        }

        DB::statement('UPDATE events SET requested_at = (SELECT MIN(r.created_at) FROM assistance_requests r WHERE r.event_id = events.id) WHERE EXISTS (SELECT 1 FROM assistance_requests r WHERE r.event_id = events.id) AND (requested_at IS NULL OR requested_at > (SELECT MIN(r.created_at) FROM assistance_requests r WHERE r.event_id = events.id))');
    }

    public function down(): void {}
};
