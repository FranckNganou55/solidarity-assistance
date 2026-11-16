<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistanceEvent extends Model
{
    protected $table = 'events';

    public $timestamps = false;

    protected $fillable = ['group_id', 'reference', 'type_id', 'beneficiary_id', 'description', 'status', 'closing_date', 'target_amount', 'requested_at', 'closed_at', 'closed_by', 'created_by', 'eligibility_overridden', 'eligibility_override_by', 'supporting_document_url', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['closing_date' => 'date', 'target_amount' => 'decimal:2', 'eligibility_overridden' => 'boolean', 'requested_at' => 'immutable_datetime', 'closed_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime', 'updated_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(AssistanceType::class, 'type_id');
    }

    public function beneficiary(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'beneficiary_id');
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class, 'event_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(AssistanceRequest::class, 'event_id');
    }
}
