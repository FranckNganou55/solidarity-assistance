<?php

namespace App\Repositories;

use App\Models\Member;

/** Data access for globally shared member accounts. */
class MemberRepository
{
    public function phoneInUse(string $phone, ?int $exceptId = null): bool
    {
        return Member::query()
            ->where('phone', trim($phone))
            ->when($exceptId, fn ($query) => $query->where('id', '<>', $exceptId))
            ->exists();
    }

    public function emailInUse(?string $email, ?int $exceptId = null): bool
    {
        $email = trim((string) $email);
        if ($email === '') {
            return false;
        }

        return Member::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($email)])
            ->when($exceptId, fn ($query) => $query->where('id', '<>', $exceptId))
            ->exists();
    }

    public function findByPhone(string $phone): ?Member
    {
        return Member::query()->where('phone', trim($phone))->first();
    }
}
