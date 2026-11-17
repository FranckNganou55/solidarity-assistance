<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

class SensitiveSettingsService
{
    private const PREFIX = 'encrypted:v1:';

    public function defaultPassword(): ?string
    {
        $setting = AppSetting::query()->where('setting_key', 'org.default.password')->first();
        if (! $setting || $setting->setting_value === '') {
            return null;
        }

        if (str_starts_with($setting->setting_value, self::PREFIX)) {
            return Crypt::decryptString(substr($setting->setting_value, strlen(self::PREFIX)));
        }

        try {
            $plainText = Crypt::decryptString($setting->setting_value);

            return $plainText;
        } catch (DecryptException $exception) {
            if (str_starts_with($setting->setting_value, 'eyJpdiI6')) {
                throw $exception;
            }

            $plainText = $setting->setting_value;
            $this->setDefaultPassword($plainText);

            return $plainText;
        }
    }

    public function setDefaultPassword(string $password): void
    {
        AppSetting::query()->updateOrCreate(
            ['setting_key' => 'org.default.password'],
            ['setting_value' => self::PREFIX.Crypt::encryptString($password), 'updated_at' => now()],
        );
    }
}
