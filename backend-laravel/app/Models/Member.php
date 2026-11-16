<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Member extends Model
{
    protected $table = 'members';

    protected $hidden = ['password_hash'];

    protected $fillable = [
        'last_name', 'first_name', 'phone', 'city', 'quarter', 'photo_url', 'photo_shape',
        'email', 'password_hash', 'must_change_password', 'active', 'super_admin', 'role_id',
        'cycle_contributions', 'total_contributions', 'required_assistances_override',
        'bureau_position', 'last_login_at',
    ];

    protected function casts(): array
    {
        return [
            'must_change_password' => 'boolean', 'active' => 'boolean', 'super_admin' => 'boolean',
            'cycle_contributions' => 'integer', 'total_contributions' => 'integer',
            'required_assistances_override' => 'integer', 'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime', 'last_login_at' => 'immutable_datetime',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(AssociationGroup::class, 'group_members')->withPivot([
            'id', 'role_id', 'is_principal_admin', 'active', 'cycle_contributions',
            'total_contributions', 'required_assistances_override', 'bureau_position', 'joined_at',
        ]);
    }

    public function contributions(): HasMany
    {
        return $this->hasMany(Contribution::class, 'member_id');
    }

    public function assistanceRequests(): HasMany
    {
        return $this->hasMany(AssistanceRequest::class, 'member_id');
    }

    public function apiTokens(): HasMany
    {
        return $this->hasMany(ApiToken::class, 'member_id');
    }
}
