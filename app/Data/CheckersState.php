<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class CheckersState extends GameState
{
    public function __construct(
        public array $board,
        public int $currentTurn,
        public Collection $players,
    ) {}
}
