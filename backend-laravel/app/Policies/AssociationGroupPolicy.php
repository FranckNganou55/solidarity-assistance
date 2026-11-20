<?php

namespace App\Policies;

use App\Models\AssociationGroup;
use App\Models\Member;

/** Global group management belongs exclusively to the platform super administrator. */
class AssociationGroupPolicy
{
    public function viewAny(Member $actor): bool
    {
        return (bool) $actor->super_admin;
    }

    public function create(Member $actor): bool
    {
        return (bool) $actor->super_admin;
    }

    public function view(Member $actor, AssociationGroup $group): bool
    {
        return (bool) $actor->super_admin;
    }

    public function update(Member $actor, AssociationGroup $group): bool
    {
        return (bool) $actor->super_admin;
    }

    public function delete(Member $actor, AssociationGroup $group): bool
    {
        return (bool) $actor->super_admin;
    }
}
