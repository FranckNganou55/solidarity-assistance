<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssociationGroup extends Model
{
    protected $table = 'association_groups';

    public $timestamps = false;

    protected $fillable = [
        'name', 'logo_url', 'city', 'description', 'contact_phone', 'contact_email',
        'primary_color', 'accent_color', 'currency', 'min_assistances_required',
        'min_contribution_amount', 'active', 'created_by', 'created_at',
    ];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'min_assistances_required' => 'integer', 'min_contribution_amount' => 'decimal:2', 'created_at' => 'immutable_datetime'];
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(Member::class, 'group_members')->withPivot([
            'id', 'role_id', 'is_principal_admin', 'active', 'cycle_contributions',
            'total_contributions', 'required_assistances_override', 'bureau_position', 'joined_at',
        ]);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class, 'group_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AssistanceEvent::class, 'group_id');
    }

    public function requests(): HasMany
    {
        return $this->hasMany(AssistanceRequest::class, 'group_id');
    }
}
