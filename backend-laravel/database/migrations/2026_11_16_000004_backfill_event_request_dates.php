<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('events') || ! Schema::hasTable('assistance_requests') || ! Schema::hasColumn('events', 'requested_at') || ! Schema::hasColumn('assistance_requests', 'event_id')) return;
        DB::statement('UPDATE events e SET requested_at = r.created_at FROM assistance_requests r WHERE r.event_id = e.id AND (e.requested_at IS NULL OR e.requested_at > r.created_at)');
    }

    public function down(): void {}
};
