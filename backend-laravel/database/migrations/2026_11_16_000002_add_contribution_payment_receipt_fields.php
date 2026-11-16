<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('contributions')) return;
        Schema::table('contributions', function (Blueprint $table): void {
            if (! Schema::hasColumn('contributions', 'payment_received')) $table->boolean('payment_received')->default(false);
            if (! Schema::hasColumn('contributions', 'receipt_reference')) $table->string('receipt_reference', 80)->nullable();
            if (! Schema::hasColumn('contributions', 'payment_received_at')) $table->timestampTz('payment_received_at')->nullable();
            if (! Schema::hasColumn('contributions', 'payment_received_by')) $table->unsignedBigInteger('payment_received_by')->nullable();
        });
        DB::table('contributions')->where('status', 'VALIDATED')->where('payment_received', false)->update([
            'payment_received' => true,
            'payment_received_at' => DB::raw('validated_at'),
            'payment_received_by' => DB::raw('validated_by'),
        ]);
    }

    public function down(): void {}
};
