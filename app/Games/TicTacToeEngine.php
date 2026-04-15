<?php

namespace App\Games;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Data\TicTacToeMoveData;
use App\Data\TicTacToeState;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class TicTacToeEngine implements GameContract
{
    public function makeState(array $data): GameState
    {
        return new TicTacToeState(
            board: $data['board'],
            currentTurn: $data['currentTurn'],
            players: collect($data['players']),
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new TicTacToeMoveData(
            row: $data['row'],
            col: $data['col'],
        );
    }

    public function initialState(Collection $players): GameState
    {
        if ($players->count() < 2) {
            throw new InvalidArgumentException('TicTacToe requires exactly two players.');
        }
        //returns a 3x3 empty board with player 1's turn
        return new TicTacToeState(
            board: [
                [0,0,0],
                [0,0,0],
                [0,0,0],
            ],
            currentTurn: 1,
            players: collect([
                1 => $players->get(0),
                2 => $players->get(1),
            ])
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof TicTacToeState) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeState.');
        }

        if (! $moveData instanceof TicTacToeMoveData) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeMoveData.');
        }

        // rejects: out-of-bounds, occupied cells, wrong player's turn
        $row = $moveData->row;
        $col = $moveData->col;

        //wrong player's turn
        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        //out of bounds
        if ($row < 0 || $row > 2 || $col < 0 || $col > 2){
            return false;
        }

        // cell occupied
        if ($state->board[$row][$col] !== 0) {
            return false;
        }

        return true;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof TicTacToeState) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeState.');
        }

        if (! $moveData instanceof TicTacToeMoveData) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeMoveData.');
        }

        //places the mark and advances the turn
        $board = $state->board;

        $board[$moveData->row][$moveData->col] = $playerNumber;

        return new TicTacToeState(
            board: $board,
            currentTurn: $playerNumber === 1 ? 2 : 1,
            players: $state->players,
        );
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof TicTacToeState) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeState.');
        }

        $board = $state->board;

        //all possible winning states
        $lines = [
            //rows
            [$board[0][0], $board[0][1], $board[0][2]],
            [$board[1][0], $board[1][1], $board[1][2]],
            [$board[2][0], $board[2][1], $board[2][2]],

            //columns
            [$board[0][0], $board[1][0], $board[2][0]],
            [$board[0][1], $board[1][1], $board[2][1]],
            [$board[0][2], $board[1][2], $board[2][2]],

            //diagonals
            [$board[0][0], $board[1][1], $board[2][2]],
            [$board[0][2], $board[1][1], $board[2][0]],
        ];

        //checks for row, column or diagonal win
        foreach ($lines as [$a, $b, $c]) {
            if ($a !== 0 && $a === $b && $b === $c) {
                return new GameResult(
                    winner: $state->players->get($a),
                    draw: false,
                );
            }
        }

        //checks if game is still ongoing
        if (in_array(0, array_merge(...$board), true)) {
            return null;
        }

        //draw
        return new GameResult(
            winner: null,
            draw: true,
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof TicTacToeState) {
            throw new InvalidArgumentException('TicTacToeEngine expects TicTacToeState.');
        }
        return $state->currentTurn;
    }
}







