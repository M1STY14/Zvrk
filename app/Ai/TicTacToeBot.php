<?php

namespace App\Ai;

use App\Data\TicTacToeMoveData;
use App\Data\TicTacToeState;

final class TicTacToeBot
{
    public const EMAIL = 'ai-bot@zvrk.local';
    public const NAME = 'AI Bot';

    public function selectMove(TicTacToeState $state): TicTacToeMoveData
    {
        $board = $state->board;
        $player = $state->currentTurn;
        $opponent = $player === 1 ? 2 : 1;

        foreach ($this->possibleMoves($board) as [$row, $col]) {
            $boardCopy = $this->applyMark($board, $row, $col, $player);

            if ($this->isWinningBoard($boardCopy, $player)) {
                return new TicTacToeMoveData(row: $row, col: $col);
            }
        }

        foreach ($this->possibleMoves($board) as [$row, $col]) {
            $boardCopy = $this->applyMark($board, $row, $col, $opponent);

            if ($this->isWinningBoard($boardCopy, $opponent)) {
                return new TicTacToeMoveData(row: $row, col: $col);
            }
        }

        $availableMoves = $this->possibleMoves($board);
        $randomMove = $availableMoves[array_rand($availableMoves)];
        [$row, $col] = $randomMove;

        return new TicTacToeMoveData(row: $row, col: $col);
    }

    private function possibleMoves(array $board): array
    {
        $moves = [];

        foreach ($board as $rowIndex => $row) {
            foreach ($row as $colIndex => $cell) {
                if ($cell === 0) {
                    $moves[] = [$rowIndex, $colIndex];
                }
            }
        }

        return $moves;
    }

    private function applyMark(array $board, int $row, int $col, int $player): array
    {
        $copy = $board;
        $copy[$row][$col] = $player;

        return $copy;
    }

    private function isWinningBoard(array $board, int $player): bool
    {
        $lines = [
            [$board[0][0], $board[0][1], $board[0][2]],
            [$board[1][0], $board[1][1], $board[1][2]],
            [$board[2][0], $board[2][1], $board[2][2]],
            [$board[0][0], $board[1][0], $board[2][0]],
            [$board[0][1], $board[1][1], $board[2][1]],
            [$board[0][2], $board[1][2], $board[2][2]],
            [$board[0][0], $board[1][1], $board[2][2]],
            [$board[0][2], $board[1][1], $board[2][0]],
        ];

        foreach ($lines as [$a, $b, $c]) {
            if ($a === $player && $b === $player && $c === $player) {
                return true;
            }
        }

        return false;
    }
}
