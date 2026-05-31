<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class BelaState extends GameState
{
    /**
     * @param  int[]  $forfeited  Player numbers that forfeited.
     */
    public function __construct(
        public array $hands,
        public array $trick,
        public array $trickHistory,
        public ?string $trumpSuit,
        public ?int $trumpCaller,
        public array $teamScores,
        public array $roundPoints,
        public string $phase,
        public int $round,
        public array $declarations,
        public int $currentTurn,
        public int $dealer,
        public ?string $turnedUpCard,
        public Collection $players,
        public array $declarationChoices = [],
        public array $bids = [],
        public array $forfeited = [],
    ) {}
}