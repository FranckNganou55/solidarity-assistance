<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ApproveAssistanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'closingDate' => ['nullable', 'date'],
            'targetAmount' => ['nullable', 'numeric', 'min:0'],
            'comment' => ['nullable', 'string', 'max:500'],
            'overrideEligibility' => ['nullable', 'boolean'],
        ];
    }
}
