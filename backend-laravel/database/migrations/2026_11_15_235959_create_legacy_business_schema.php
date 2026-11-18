<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The existing PostgreSQL database was created by Flyway. This migration
     * adopts that schema without touching it, and can create the latest schema
     * when installing Laravel against an empty database.
     */
    public function up(): void
    {
        if (Schema::hasTable('members')) {
            return;
        }

        Schema::create('association_groups', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 120);
            $table->string('logo_url', 300)->nullable();
            $table->string('city', 80)->nullable();
            $table->string('description', 500)->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('contact_email', 120)->nullable();
            $table->string('primary_color', 20)->default('#1E6F5C');
            $table->string('accent_color', 20)->default('#2D9CDB');
            $table->string('currency', 20)->default('FCFA');
            $table->unsignedInteger('min_assistances_required')->default(2);
            $table->decimal('min_contribution_amount', 14, 2)->default(0);
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('association_groups');
            $table->string('code', 40);
            $table->string('name', 80);
            $table->string('description', 255)->nullable();
            $table->boolean('system_role')->default(false);
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['group_id', 'code']);
        });

        Schema::create('role_permissions', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->string('permission', 60);
            $table->primary(['role_id', 'permission']);
        });

        Schema::create('members', function (Blueprint $table): void {
            $table->id();
            $table->string('last_name', 80);
            $table->string('first_name', 80);
            $table->string('phone', 30)->unique();
            $table->string('city', 80);
            $table->string('quarter', 80)->nullable();
            $table->string('photo_url', 300)->nullable();
            $table->string('photo_shape', 10)->default('CIRCLE');
            $table->string('email', 120)->nullable();
            $table->string('password_hash', 255);
            $table->boolean('must_change_password')->default(true);
            $table->boolean('active')->default(true);
            $table->boolean('super_admin')->default(false);
            $table->foreignId('role_id')->constrained('roles');
            $table->unsignedInteger('cycle_contributions')->default(0);
            $table->unsignedInteger('total_contributions')->default(0);
            $table->unsignedInteger('required_assistances_override')->nullable();
            $table->string('bureau_position', 50)->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable();
            $table->timestampTz('last_login_at')->nullable();
        });

        Schema::create('group_members', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('association_groups');
            $table->foreignId('member_id')->constrained('members');
            $table->foreignId('role_id')->constrained('roles');
            $table->boolean('is_principal_admin')->default(false);
            $table->boolean('active')->default(true);
            $table->unsignedInteger('cycle_contributions')->default(0);
            $table->unsignedInteger('total_contributions')->default(0);
            $table->unsignedInteger('required_assistances_override')->nullable();
            $table->string('bureau_position', 50)->nullable();
            $table->timestampTz('joined_at')->useCurrent();
            $table->unique(['group_id', 'member_id']);
            $table->index('member_id');
            $table->index(['group_id', 'role_id']);
        });

        Schema::create('assistance_types', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('association_groups');
            $table->string('name', 80);
            $table->string('description', 400)->nullable();
            $table->string('icon', 16)->nullable();
            $table->boolean('active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->unique(['group_id', 'name'], 'uk_assistance_type_group_lower_name');
        });

        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('association_groups');
            $table->string('reference', 30)->unique();
            $table->foreignId('type_id')->constrained('assistance_types');
            $table->foreignId('beneficiary_id')->constrained('members');
            $table->string('description', 1000)->nullable();
            $table->string('status', 20)->default('OPEN');
            $table->date('closing_date')->nullable();
            $table->decimal('target_amount', 12, 2)->nullable();
            $table->timestampTz('requested_at')->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->boolean('eligibility_overridden')->default(false);
            $table->unsignedBigInteger('eligibility_override_by')->nullable();
            $table->string('supporting_document_url', 300)->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->nullable();
            $table->index(['group_id', 'status']);
            $table->index('beneficiary_id');
        });

        Schema::create('contributions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('members');
            $table->decimal('amount', 12, 2);
            $table->string('method', 20)->default('CASH');
            $table->string('note', 255)->nullable();
            $table->string('status', 20)->default('PENDING');
            $table->unsignedInteger('cycle_number')->nullable();
            $table->timestampTz('submitted_at')->useCurrent();
            $table->timestampTz('validated_at')->nullable();
            $table->unsignedBigInteger('validated_by')->nullable();
            $table->string('rejection_reason', 255)->nullable();
            $table->boolean('payment_received')->default(false);
            $table->string('receipt_reference', 80)->nullable();
            $table->timestampTz('payment_received_at')->nullable();
            $table->unsignedBigInteger('payment_received_by')->nullable();
            $table->string('proof_photo_url', 300)->nullable();
            $table->string('proof_photo_shape', 10)->default('SQUARE');
            $table->unique(['event_id', 'member_id']);
            $table->index('member_id');
        });

        Schema::create('assistance_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->constrained('association_groups');
            $table->foreignId('member_id')->constrained('members');
            $table->foreignId('type_id')->constrained('assistance_types');
            $table->string('reason', 1000);
            $table->string('status', 20)->default('PENDING');
            $table->unsignedInteger('cycle_count_at_request')->nullable();
            $table->unsignedInteger('min_required_at_request')->nullable();
            $table->boolean('eligible')->default(false);
            $table->string('decision_comment', 500)->nullable();
            $table->unsignedBigInteger('decided_by')->nullable();
            $table->timestampTz('decided_at')->nullable();
            $table->foreignId('event_id')->nullable()->constrained('events');
            $table->string('document_url', 300)->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['group_id', 'created_at']);
            $table->index('member_id');
        });

        Schema::create('app_settings', function (Blueprint $table): void {
            $table->string('setting_key', 80)->primary();
            $table->string('setting_value', 2000)->nullable();
            $table->timestampTz('updated_at')->useCurrent();
        });

        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->nullable()->constrained('association_groups');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->string('actor_name', 120)->nullable();
            $table->string('action', 60)->nullable();
            $table->string('entity_type', 40)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('details', 1000)->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->index(['group_id', 'created_at']);
        });

        Schema::create('app_notifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('group_id')->nullable()->constrained('association_groups');
            $table->foreignId('recipient_id')->constrained('members')->cascadeOnDelete();
            $table->string('notification_type', 40);
            $table->string('title', 160);
            $table->string('message', 500);
            $table->string('entity_type', 40)->nullable();
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('read_at')->nullable();
            $table->index(['group_id', 'recipient_id', 'created_at']);
        });
    }

    public function down(): void
    {
        // The business tables and their data may predate Laravel; never drop them here.
    }
};
