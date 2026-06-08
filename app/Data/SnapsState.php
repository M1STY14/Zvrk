<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class SnapsState extends GameState
{
    public function __construct(
        public Collection $players,
        public int $currentTurn,
        public Collection $hands,
        public Collection $stock,
        public SnapsCard $trumpCard,
        public Collection $trick = new Collection(),
        public Collection $capturedPoints = new Collection(),
        public Collection $scores = new Collection(),
        public ?int $lastTrickWinner = null,
        public Collection $drawQueue = new Collection(),
        public bool $closed = false,
        public ?int $closedBy = null,
        /**
         * Points snapshot taken at the moment a player closes; used to freeze opponent's points
         * for final scoring when a close occurs.
         */
        public Collection $totalPointsAtClose = new Collection(),
    ) {}
}
