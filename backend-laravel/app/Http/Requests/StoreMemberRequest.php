<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMemberRequest extends FormRequest
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
            'firstName' => ['required', 'string', 'max:80'],
            'lastName' => ['required', 'string', 'max:80'],
            'phone' => ['required', 'string', 'max:30'],
            'city' => ['required', 'string', 'max:80'],
            'quarter' => ['nullable', 'string', 'max:80'],
            'email' => ['nullable', 'email', 'max:120'],
            'photoUrl' => ['nullable', 'string', 'max:300'],
            'photoShape' => ['nullable', 'in:CIRCLE,SQUARE'],
            'password' => ['nullable', 'string', 'max:72'],
            'requiredAssistancesOverride' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
