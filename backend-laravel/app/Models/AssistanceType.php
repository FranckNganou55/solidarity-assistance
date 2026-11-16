<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistanceType extends Model
{
    protected $table = 'assistance_types';

    public $timestamps = false;

    protected $fillable = ['group_id', 'name', 'description', 'icon', 'active', 'created_by', 'created_at'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'created_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AssistanceEvent::class, 'type_id');
    }
}
