<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePlayerInGame
{
    public function handle(Request $request, Closure $next): Response
    {
        $session = $request->route('session');

        $isPlayer = $session->players()
            ->where('user_id', $request->user()->id)
            ->exists();

        if (! $isPlayer) {
            abort(403, 'You are not a player in this game session.');
        }

        return $next($request);
    }
}
