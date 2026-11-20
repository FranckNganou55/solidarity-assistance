<?php

namespace App\Services;

use App\Mail\MemberAccessCredentials;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MemberCredentialsEmailService
{
    public function schedule(string $email, string $memberName, string $groupName, string $identifier, ?string $temporaryPassword, string $loginUrl, array $context = []): bool
    {
        if (trim($email) === '' || in_array(config('mail.default'), ['log', 'array'], true)) {
            return false;
        }

        // Send after Laravel has returned the API response so SMTP latency
        // cannot turn a completed member creation into a client timeout.
        app()->terminating(function () use ($email, $memberName, $groupName, $identifier, $temporaryPassword, $loginUrl, $context): void {
            try {
                $sent = Mail::to($email)->send(new MemberAccessCredentials($memberName, $groupName, $identifier, $temporaryPassword, $loginUrl));
                Log::info('Member access email accepted by the configured mail transport.', $context + [
                    'recipient' => $this->maskEmail($email),
                    'message_id' => $sent?->getMessageId(),
                ]);
            } catch (Throwable $exception) {
                Log::warning('Member access email failed after the API response.', $context + [
                    'recipient' => $this->maskEmail($email),
                    'exception' => $exception::class,
                ]);
            }
        });

        return true;
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return $domain === '' ? '[invalid]' : mb_substr($local, 0, 1).'***@'.$domain;
    }
}
