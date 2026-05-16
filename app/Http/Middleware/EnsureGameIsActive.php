<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureGameIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $game = $request->route('game');

        if (! $game?->is_active) {
            abort(404);
        }

        return $next($request);
    }
}
