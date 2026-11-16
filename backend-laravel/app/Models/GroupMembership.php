<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GroupMembership extends Model
{
    protected $table = 'group_members';

    public $timestamps = false;

    protected $fillable = [
        'group_id', 'member_id', 'role_id', 'is_principal_admin', 'active', 'cycle_contributions',
        'total_contributions', 'required_assistances_override', 'bureau_position', 'joined_at',
    ];

    protected function casts(): array
    {
        return ['is_principal_admin' => 'boolean', 'active' => 'boolean', 'cycle_contributions' => 'integer', 'total_contributions' => 'integer', 'required_assistances_override' => 'integer', 'joined_at' => 'immutable_datetime'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(AssociationGroup::class, 'group_id');
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(Member::class, 'member_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }
}
