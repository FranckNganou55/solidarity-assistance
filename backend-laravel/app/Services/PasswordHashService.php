<?php

namespace App\Services;

use Illuminate\Support\Facades\Hash;

class PasswordHashService
{
    private const PREFIX = 'bcrypt-sha256:';

    public function make(#[\SensitiveParameter] string $password): string
    {
        $prehash = base64_encode(hash('sha256', $password, true));

        return self::PREFIX.Hash::driver('bcrypt')->make($prehash);
    }

    public function check(#[\SensitiveParameter] string $password, string $storedHash): bool
    {
        if (str_starts_with($storedHash, self::PREFIX)) {
            return Hash::driver('bcrypt')->check(base64_encode(hash('sha256', $password, true)), substr($storedHash, strlen(self::PREFIX)));
        }

        return password_verify($password, $storedHash);
    }

    public function needsRehash(string $storedHash): bool
    {
        if (! str_starts_with($storedHash, self::PREFIX)) {
            return true;
        }

        return Hash::driver('bcrypt')->needsRehash(substr($storedHash, strlen(self::PREFIX)));
    }
}
