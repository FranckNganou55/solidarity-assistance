<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('role_permissions')) return;
        DB::statement("INSERT INTO role_permissions(role_id,permission) SELECT role_id,'CONTRIBUTION_VIEW' FROM role_permissions WHERE permission='CONTRIBUTION_SUBMIT' ON CONFLICT DO NOTHING");
    }

    public function down(): void {}
};
