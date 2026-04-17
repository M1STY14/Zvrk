<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the game catalog dashboard with user stats.
     */
    public function index(Request $request): Response
    {
        $user = $request->user()->load(['playerStats']);

        // Get all games ordered by active status first, then by name
        $games = Game::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(function ($game) use ($user) {
                $userStat = $user->playerStats->firstWhere('game_id', $game->id);

                // Count total active players in this game (across all active sessions)
                $activePlayersCount = $game->gameSessions()
                    ->whereIn('status', [GameStatus::Waiting->value, GameStatus::Playing->value])
                    ->withCount('players')
                    ->get()
                    ->sum('players_count');

                return [
                    'id' => $game->id,
                    'name' => $game->name,
                    'slug' => $game->slug,
                    'description' => $game->description,
                    'image' => $game->image,
                    'is_active' => $game->is_active,
                    'min_players' => $game->min_players,
                    'max_players' => $game->max_players,
                    'active_players' => $activePlayersCount,
                    'user_games_played' => $userStat?->games_played ?? 0,
                    'user_wins' => $userStat?->wins ?? 0,
                ];
            });

        // Calculate overall user stats
        $totalGamesPlayed = $user->playerStats->sum('games_played');
        $totalWins = $user->playerStats->sum('wins');
        $overallWinRate = $totalGamesPlayed > 0 ? round(($totalWins / $totalGamesPlayed) * 100, 1) : 0;

        return Inertia::render('Dashboard', [
            'games' => $games,
            'userStats' => [
                'totalGamesPlayed' => $totalGamesPlayed,
                'overallWinRate' => $overallWinRate,
            ],
        ]);
    }
}
