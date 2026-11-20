<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssociationGroupResource extends JsonResource
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
            'name' => $this->resource['name'],
            'logoUrl' => $this->resource['logoUrl'],
            'city' => $this->resource['city'],
            'description' => $this->resource['description'],
            'contactPhone' => $this->resource['contactPhone'],
            'contactEmail' => $this->resource['contactEmail'],
            'primaryColor' => $this->resource['primaryColor'],
            'accentColor' => $this->resource['accentColor'],
            'currency' => $this->resource['currency'],
            'minAssistancesRequired' => (int) $this->resource['minAssistancesRequired'],
            'principalAdmin' => (bool) $this->resource['principalAdmin'],
            'active' => (bool) ($this->resource['active'] ?? true),
        ];
    }
}
