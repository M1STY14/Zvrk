<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class GameResult extends Data
{
    public function __construct(
        public mixed $winner,
        public bool $draw,
        public ?int $winningTeam = null,
    ) {}
}
