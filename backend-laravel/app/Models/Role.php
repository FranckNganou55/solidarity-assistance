<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'roles';

    public $timestamps = false;

    protected $fillable = ['group_id', 'code', 'name', 'description', 'system_role', 'created_at'];

    protected function casts(): array
    {
        return ['system_role' => 'boolean', 'created_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(RolePermission::class, 'role_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(GroupMembership::class, 'role_id');
    }
}
