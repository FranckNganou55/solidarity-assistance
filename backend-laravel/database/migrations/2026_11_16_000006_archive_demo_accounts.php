<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('members')) {
            DB::table('members')->whereIn('phone', ['690000002', '690000003', '677000101', '677000102', '677000103', '677000104', '677000105', '677000106', '677000107', '677000108'])->update(['active' => false]);
        }
    }

    public function down(): void {}
};
