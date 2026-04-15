<?php

namespace App\Contracts;

use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use Illuminate\Support\Collection;

interface GameContract
{
    public function initialState(Collection $players): GameState;

    public function makeState(array $data): GameState;

    public function makeMoveData(array $data): MoveData;

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool;

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState;

    public function checkGameOver(GameState $state): ?GameResult;

    public function getCurrentTurn(GameState $state): int;
}
