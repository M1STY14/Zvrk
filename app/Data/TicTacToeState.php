<?php

namespace App\Data;

class TicTacToeState extends GameState
{
    public function __construct(
        public array $board,
        public int $currentTurn,
    ) {}
}