<?php

namespace App\Data;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\User;
use Spatie\LaravelData\Data;

final class AllGamesDashboardData extends Data
{
    public function __construct(
        public string $id,
        public string $name,
        public string $slug,
        public ?string $description,
        public ?string $image,
        public bool $is_active,
        public int $min_players,
        public int $max_players,
        public int $active_players,
        public int $user_games_played,
        public int $user_wins,
    ) {
    }

    public static function fromCustom(Game $game, User $user): self
    {
        $userStat = $user->playerStats->firstWhere('game_id', $game->id);

        $activePlayersCount = $game->gameSessions()
            ->whereIn('status', [GameStatus::Pending->value, GameStatus::Playing->value])
            ->withCount('players')
            ->get()
            ->sum('players_count');

        return new self(
            id: $game->id,
            name: $game->name,
            slug: $game->slug,
            description: $game->description,
            image: $game->image,
            is_active: $game->is_active,
            min_players: $game->min_players,
            max_players: $game->max_players,
            active_players: $activePlayersCount,
            user_games_played: $userStat->games_played,
            user_wins: $userStat->wins,
        );
    }
}
