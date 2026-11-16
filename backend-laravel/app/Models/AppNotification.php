<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $table = 'app_notifications';

    public $timestamps = false;

    protected $fillable = ['group_id', 'recipient_id', 'notification_type', 'title', 'message', 'entity_type', 'entity_id', 'created_at', 'read_at'];

    protected function casts(): array
    {
        return ['entity_id' => 'integer', 'created_at' => 'immutable_datetime', 'read_at' => 'immutable_datetime'];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'recipient_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }
}
