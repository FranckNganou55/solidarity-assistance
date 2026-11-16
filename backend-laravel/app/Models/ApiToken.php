<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiToken extends Model
{
    protected $table = 'app_api_tokens';

    public $timestamps = false;

    protected $fillable = ['member_id', 'token_hash', 'expires_at', 'created_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'immutable_datetime', 'created_at' => 'immutable_datetime'];
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
