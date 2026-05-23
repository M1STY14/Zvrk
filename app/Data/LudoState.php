<?php

namespace App\Data;

use App\Enums\LudoPhase;
use Illuminate\Support\Collection;

final class LudoState extends GameState
{
    /**
     * @param  int[]  $forfeited  Player numbers that forfeited.
     */
    public function __construct(
        public array $tokens,
        public int $currentTurn,
        public array $pendingDice,
        public LudoPhase $phase,
        public int $consecutiveDoubles,
        public Collection $players,
        public array $forfeited = [],
    ) {}
}
