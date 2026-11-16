<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistanceRequest extends Model
{
    protected $table = 'assistance_requests';

    public $timestamps = false;

    protected $fillable = ['group_id', 'member_id', 'type_id', 'reason', 'status', 'cycle_count_at_request', 'min_required_at_request', 'eligible', 'decision_comment', 'decided_by', 'decided_at', 'event_id', 'document_url', 'created_at'];

    protected function casts(): array
    {
        return ['cycle_count_at_request' => 'integer', 'min_required_at_request' => 'integer', 'eligible' => 'boolean', 'decided_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(AssistanceType::class, 'type_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(AssistanceEvent::class, 'event_id');
    }
}
