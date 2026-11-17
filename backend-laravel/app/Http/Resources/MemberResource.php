<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (int) $this->resource['id'],
            'lastName' => $this->resource['lastName'],
            'firstName' => $this->resource['firstName'],
            'fullName' => $this->resource['fullName'],
            'phone' => $this->resource['phone'],
            'city' => $this->resource['city'],
            'quarter' => $this->resource['quarter'],
            'photoUrl' => $this->resource['photoUrl'],
            'email' => $this->resource['email'],
            'active' => (bool) $this->resource['active'],
            'status' => $this->resource['status'] ?? ($this->resource['active'] ? 'ACTIVE' : 'INACTIVE'),
            'roleId' => (int) $this->resource['roleId'],
            'roleCode' => $this->resource['roleCode'],
            'roleName' => $this->resource['roleName'],
            'superAdmin' => (bool) $this->resource['superAdmin'],
            'groupAdmin' => (bool) $this->resource['groupAdmin'],
            'mustChangePassword' => (bool) $this->resource['mustChangePassword'],
            'cycleContributions' => (int) $this->resource['cycleContributions'],
            'totalContributions' => (int) $this->resource['totalContributions'],
            'requiredAssistances' => (int) $this->resource['requiredAssistances'],
            'requiredAssistancesOverride' => $this->resource['requiredAssistancesOverride'],
            'bureauPosition' => $this->resource['bureauPosition'],
            'eligibleForAssistance' => (bool) $this->resource['eligibleForAssistance'],
            'createdAt' => $this->resource['createdAt'],
            'lastLoginAt' => $this->resource['lastLoginAt'],
            'permissions' => $this->resource['permissions'],
            'photoShape' => $this->resource['photoShape'],
        ];
    }
}
