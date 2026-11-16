<?php

namespace App\Http\Middleware;

use App\Models\ApiToken;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $plain = preg_replace('/^Bearer\s+/i', '', (string) $request->header('Authorization'));
        if (! $plain) {
            return response()->json(['code' => 'unauthorized', 'message' => 'Authentification requise'], 401);
        }
        $token = ApiToken::query()->with('member')->where('token_hash', hash('sha256', $plain))->where('expires_at', '>', now())->first();
        if (! $token) {
            return response()->json(['code' => 'unauthorized', 'message' => 'Session expirée'], 401);
        }
        $member = $token->member;
        if (! $member || ! $member->active) {
            return response()->json(['code' => 'forbidden', 'message' => 'Compte archivé'], 403);
        }
        $request->attributes->set('member', $member);
        $request->attributes->set('memberId', (int) $member->id);
        $request->attributes->set('groupId', (int) ($request->header('X-Group-Id') ?: 0));

        return $next($request);
    }
}
