<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $table = 'audit_logs';

    public $timestamps = false;

    protected $fillable = ['group_id', 'actor_id', 'actor_name', 'action', 'entity_type', 'entity_id', 'details', 'created_at'];

    protected function casts(): array
    {
        return ['entity_id' => 'integer', 'created_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }
}
