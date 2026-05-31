<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class SnapsState extends GameState
{
    public function __construct(
        public Collection $players,
        public int $currentTurn,
        public array $hands,
        public array $stock,
        public string $trumpCard,
        public array $trick = [],
        public array $capturedPoints = [1 => 0, 2 => 0],
        public array $scores = [1 => 0, 2 => 0],
        public ?int $lastTrickWinner = null,
        public array $drawQueue = [],
        public bool $closed = false,
        public ?int $closedBy = null,
        /**
         * Points snapshot taken at the moment a player closes; used to freeze opponent's points
         * for final scoring when a close occurs.
         */
        public array $totalPointsAtClose = [1 => 0, 2 => 0],
    ) {}
}
