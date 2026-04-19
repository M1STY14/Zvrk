<?php

namespace App\Http\Controllers;

use App\Data\AllGamesDashboardData;
use App\Models\Game;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user()->load('playerStats');

        $games = Game::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn (Game $game) => AllGamesDashboardData::fromCustom($game, $user));

        return Inertia::render('Dashboard', [
            'games' => $games,
            'userStats' => [
                'totalGamesPlayed' => $user->totalGamesPlayed(),
                'overallWinRate' => $user->overallWinRate(),
            ],
        ]);
    }
}
