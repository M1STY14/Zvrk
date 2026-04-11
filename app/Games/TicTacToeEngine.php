<?php

namespace App\Games;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\TicTacToeState;
use App\Data\TicTacToeMoveData;
use App\Data\MoveData;
use Illuminate\Support\Collection;

class TicTacToeEngine implements GameContract
{

    public function initialState(Collection $players): GameState
    {
        //returns a 3x3 empty board with player 1's turn
        return new TicTacToeState(
            board: [
                [0,0,0],
                [0,0,0],
                [0,0,0],
            ],
            currentTurn: 1
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
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

    public function applyMove(Gamestate $state, int $playerNumber, MoveData $moveData): GameState
    {
        //places the mark and advances the turn
        $board = $state->board;

        $board[$moveData->row][$moveData->col] = $playerNumber;

        return new TicTacToeState(
            board: $board,
            currentTurn: $playerNumber === 1 ? 2 : 1
        );
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        //detects: row win, column win, diagonal win, draw (full board), and returns null if game is ongoing
        $board=$state->board;

        //row win
        for ($row=0;$row<3;$row++){
            if($board[$row][0] !== 0 && $board[$row][0] === $board[$row][1] && $board[$row][1] === $board[$row][2])
            {
                return new GameResult(
                    winner: $board[$row][0],
                    draw: false
                );
            }
        }

        //column win
        for ($col=0;$col<3;$col++){
            if($board[0][$col] !== 0 && $board[0][$col] === $board[1][$col] && $board[1][$col] === $board[2][$col])
            {
                return new GameResult(
                    winner: $board[0][$col],
                    draw: false
                );
            }
        }

        //diagonal win \
        if ($board[0][0] === $board[1][1] && $board[1][1] === $board[2][2]){
            return new GameResult(
                winner: $board[0][0],
                draw: false
            );
        }

        //diagonal win /
        if ($board[0][2] === $board[1][1] && $board[1][1] === $board[2][0]){
            return new GameResult(
                winner: $board[0][2],
                draw: false
            );
        }

        //game is still ongoing
        for($row=0;$row<3;$row++){
            for($col=0;$col<3;$col++){
                if($board[$row][$col] === 0){
                    return null;
                }
            }
        }

        //draw
        return new GameResult(
            winner: null,
            draw: true,
        );

    }

    public function getCurrentTurn(GameState $state): int
    {
        return $state->currentTurn;
    }
}







