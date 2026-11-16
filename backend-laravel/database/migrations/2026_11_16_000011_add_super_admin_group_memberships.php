<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('group_members') || ! Schema::hasTable('association_groups') || ! Schema::hasTable('members')) return;
        DB::statement("INSERT INTO group_members(group_id,member_id,role_id,is_principal_admin,active,cycle_contributions,total_contributions,required_assistances_override,bureau_position,joined_at) SELECT g.id,m.id,r.id,FALSE,TRUE,0,0,NULL,NULL,now() FROM association_groups g JOIN members m ON m.super_admin=TRUE AND m.active=TRUE JOIN roles r ON r.group_id=g.id AND r.code='MEMBRE' WHERE g.active=TRUE ON CONFLICT(group_id,member_id) DO NOTHING");
    }

    public function down(): void {}
};
