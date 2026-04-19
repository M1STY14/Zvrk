<?php

namespace App\Data;

use App\Models\PlayerStat;
use Spatie\LaravelData\Data;

final class PlayerStatData extends Data
{
    public function __construct(
        public string $game,
        public int $gamesPlayed,
        public int $wins,
        public int $losses,
        public int $draws,
        public float $winRate,
    ) {
    }

    public static function fromModel(PlayerStat $stat): self
    {
        return new self(
            game: $stat->game->name,
            gamesPlayed: $stat->games_played,
            wins: $stat->wins,
            losses: $stat->losses,
            draws: $stat->draws,
            winRate: $stat->winRate(),
        );
    }
}
