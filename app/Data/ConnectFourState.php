<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class ConnectFourState extends GameState
{
    /**
     * @param  int[]  $forfeited  Player numbers that forfeited.
     */
    public function __construct(
        public array $board,
        public int $currentTurn,
        public Collection $players,
        public array $forfeited = [],
    ) {}
}
