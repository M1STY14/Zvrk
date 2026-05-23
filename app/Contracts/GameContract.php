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

    /**
     * Remove a player from an in-progress game, advancing the turn off them if needed.
     * The remaining players keep playing.
     */
    public function forfeitPlayer(GameState $state, int $playerNumber): GameState;

    /**
     * Player numbers still in the game (i.e. not forfeited).
     *
     * @return int[]
     */
    public function activePlayerNumbers(GameState $state): array;
}
