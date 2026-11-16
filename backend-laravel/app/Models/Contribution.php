<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contribution extends Model
{
    protected $table = 'contributions';

    public $timestamps = false;

    protected $fillable = ['event_id', 'member_id', 'amount', 'method', 'note', 'status', 'cycle_number', 'submitted_at', 'validated_at', 'validated_by', 'rejection_reason', 'payment_received', 'receipt_reference', 'payment_received_at', 'payment_received_by', 'proof_photo_url', 'proof_photo_shape'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'cycle_number' => 'integer', 'payment_received' => 'boolean', 'submitted_at' => 'immutable_datetime', 'validated_at' => 'immutable_datetime', 'payment_received_at' => 'immutable_datetime'];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(AssistanceEvent::class, 'event_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
