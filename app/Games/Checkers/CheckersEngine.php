<?php

namespace App\Games\Checkers;

use App\Contracts\GameContract;
use App\Data\CheckersMoveData;
use App\Data\CheckersState;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class CheckersEngine implements GameContract
{
    public function initialState(Collection $players): GameState
    {
        if ($players->count() < 2) {
            throw new InvalidArgumentException('Checkers requires exactly two players.');
        }

        $board = array_fill(0, 8, array_fill(0, 8, 0));

        for ($row = 0; $row < 8; $row++) {
            $piece = $row < 3 ? 2 : ($row > 4 ? 1 : 0);
            if ($piece === 0) {
                continue;
            }
            for ($col = ($row + 1) % 2; $col < 8; $col += 2) {
                $board[$row][$col] = $piece;
            }
        }

        return new CheckersState(
            board: $board,
            currentTurn: 1,
            players: collect([
                1 => $players->get(0),
                2 => $players->get(1),
            ]),
        );
    }

    public function makeState(array $data): GameState
    {
        return new CheckersState(
            board: $data['board'],
            currentTurn: $data['currentTurn'],
            players: collect($data['players']),
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new CheckersMoveData(
            from: $data['from'],
            path: $data['path'],
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof CheckersState) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersState.');
        }

        return $state->currentTurn;
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof CheckersState) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersState.');
        }

        if (! $moveData instanceof CheckersMoveData) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        if (! isset($moveData->from['row'], $moveData->from['col'])) {
            return false;
        }

        $fromRow = $moveData->from['row'];
        $fromCol = $moveData->from['col'];

        if (! is_int($fromRow) || ! is_int($fromCol)) {
            return false;
        }

        if (! $this->inBounds($fromRow, $fromCol) || ! $this->isDark($fromRow, $fromCol)) {
            return false;
        }

        $piece = $state->board[$fromRow][$fromCol];
        if (! $this->isOwned($piece, $playerNumber)) {
            return false;
        }

        if (count($moveData->path) === 0) {
            return false;
        }

        foreach ($moveData->path as $step) {
            if (! is_array($step) || ! isset($step['row'], $step['col'])) {
                return false;
            }
            if (! is_int($step['row']) || ! is_int($step['col'])) {
                return false;
            }
            if (! $this->inBounds($step['row'], $step['col']) || ! $this->isDark($step['row'], $step['col'])) {
                return false;
            }
        }

        $firstStep = $moveData->path[0];
        $rowDelta = $firstStep['row'] - $fromRow;
        $colDelta = $firstStep['col'] - $fromCol;

        if (abs($rowDelta) === 1 && abs($colDelta) === 1) {
            if (count($moveData->path) !== 1) {
                return false;
            }

            if ($this->hasAnyCapture($state->board, $playerNumber)) {
                return false;
            }

            if ($state->board[$firstStep['row']][$firstStep['col']] !== 0) {
                return false;
            }

            $allowedDirections = $this->forwardRowDirections($piece, $playerNumber);

            return in_array($rowDelta, $allowedDirections, true);
        }

        if (abs($rowDelta) === 2 && abs($colDelta) === 2) {
            $sequences = $this->generateCaptureSequences($state->board, $fromRow, $fromCol, $piece, $playerNumber);

            foreach ($sequences as $sequence) {
                if ($this->pathsEqual($sequence, $moveData->path)) {
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof CheckersState) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersState.');
        }

        if (! $moveData instanceof CheckersMoveData) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersMoveData.');
        }

        $board = $state->board;
        $fromRow = $moveData->from['row'];
        $fromCol = $moveData->from['col'];
        $piece = $board[$fromRow][$fromCol];
        $board[$fromRow][$fromCol] = 0;

        $currentRow = $fromRow;
        $currentCol = $fromCol;

        foreach ($moveData->path as $step) {
            $nextRow = $step['row'];
            $nextCol = $step['col'];
            $rowDelta = $nextRow - $currentRow;
            $colDelta = $nextCol - $currentCol;

            if (abs($rowDelta) === 2) {
                $board[$currentRow + intdiv($rowDelta, 2)][$currentCol + intdiv($colDelta, 2)] = 0;
            }

            $currentRow = $nextRow;
            $currentCol = $nextCol;
        }

        $lastRow = $playerNumber === 1 ? 0 : 7;
        if (! $this->isKing($piece) && $currentRow === $lastRow) {
            $piece = $playerNumber === 1 ? 3 : 4;
        }

        $board[$currentRow][$currentCol] = $piece;

        return new CheckersState(
            board: $board,
            currentTurn: $playerNumber === 1 ? 2 : 1,
            players: $state->players,
        );
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof CheckersState) {
            throw new InvalidArgumentException('CheckersEngine expects CheckersState.');
        }

        $playerOneCount = 0;
        $playerTwoCount = 0;
        foreach ($state->board as $row) {
            foreach ($row as $cell) {
                if ($cell === 1 || $cell === 3) {
                    $playerOneCount++;
                } elseif ($cell === 2 || $cell === 4) {
                    $playerTwoCount++;
                }
            }
        }

        if ($playerOneCount === 0) {
            return new GameResult(winner: $state->players->get(2), draw: false);
        }

        if ($playerTwoCount === 0) {
            return new GameResult(winner: $state->players->get(1), draw: false);
        }

        $currentPlayer = $state->currentTurn;
        if (! $this->hasAnyLegalMove($state->board, $currentPlayer)) {
            $otherPlayer = $currentPlayer === 1 ? 2 : 1;

            return new GameResult(winner: $state->players->get($otherPlayer), draw: false);
        }

        return null;
    }

    private function inBounds(int $row, int $col): bool
    {
        return $row >= 0 && $row < 8 && $col >= 0 && $col < 8;
    }

    private function isDark(int $row, int $col): bool
    {
        return ($row + $col) % 2 === 1;
    }

    private function isOwned(int $cell, int $player): bool
    {
        return $player === 1 ? ($cell === 1 || $cell === 3) : ($cell === 2 || $cell === 4);
    }

    private function isOpponent(int $cell, int $player): bool
    {
        return $player === 1 ? ($cell === 2 || $cell === 4) : ($cell === 1 || $cell === 3);
    }

    private function isKing(int $cell): bool
    {
        return $cell === 3 || $cell === 4;
    }

    private function forwardRowDirections(int $piece, int $player): array
    {
        if ($this->isKing($piece)) {
            return [-1, 1];
        }

        return $player === 1 ? [-1] : [1];
    }

    private function hasAnyCapture(array $board, int $player): bool
    {
        for ($row = 0; $row < 8; $row++) {
            for ($col = 0; $col < 8; $col++) {
                $cell = $board[$row][$col];
                if (! $this->isOwned($cell, $player)) {
                    continue;
                }
                if ($this->hasImmediateCapture($board, $row, $col, $cell, $player)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function hasImmediateCapture(array $board, int $row, int $col, int $piece, int $player): bool
    {
        $rowDirections = $this->forwardRowDirections($piece, $player);
        foreach ($rowDirections as $rowDelta) {
            foreach ([-1, 1] as $colDelta) {
                $midRow = $row + $rowDelta;
                $midCol = $col + $colDelta;
                $landRow = $row + 2 * $rowDelta;
                $landCol = $col + 2 * $colDelta;

                if (! $this->inBounds($landRow, $landCol)) {
                    continue;
                }
                if (! $this->isOpponent($board[$midRow][$midCol], $player)) {
                    continue;
                }
                if ($board[$landRow][$landCol] !== 0) {
                    continue;
                }

                return true;
            }
        }

        return false;
    }

    private function hasAnyLegalMove(array $board, int $player): bool
    {
        if ($this->hasAnyCapture($board, $player)) {
            return true;
        }

        for ($row = 0; $row < 8; $row++) {
            for ($col = 0; $col < 8; $col++) {
                $cell = $board[$row][$col];
                if (! $this->isOwned($cell, $player)) {
                    continue;
                }
                $rowDirections = $this->forwardRowDirections($cell, $player);
                foreach ($rowDirections as $rowDelta) {
                    foreach ([-1, 1] as $colDelta) {
                        $nextRow = $row + $rowDelta;
                        $nextCol = $col + $colDelta;
                        if ($this->inBounds($nextRow, $nextCol) && $board[$nextRow][$nextCol] === 0) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    private function generateCaptureSequences(array $board, int $row, int $col, int $piece, int $player): array
    {
        $sequences = [];
        $rowDirections = $this->forwardRowDirections($piece, $player);
        $lastRow = $player === 1 ? 0 : 7;

        foreach ($rowDirections as $rowDelta) {
            foreach ([-1, 1] as $colDelta) {
                $midRow = $row + $rowDelta;
                $midCol = $col + $colDelta;
                $landRow = $row + 2 * $rowDelta;
                $landCol = $col + 2 * $colDelta;

                if (! $this->inBounds($landRow, $landCol)) {
                    continue;
                }
                if (! $this->isOpponent($board[$midRow][$midCol], $player)) {
                    continue;
                }
                if ($board[$landRow][$landCol] !== 0) {
                    continue;
                }

                $newBoard = $board;
                $newBoard[$row][$col] = 0;
                $newBoard[$midRow][$midCol] = 0;

                $newPiece = $piece;
                $promoted = false;
                if (! $this->isKing($piece) && $landRow === $lastRow) {
                    $newPiece = $player === 1 ? 3 : 4;
                    $promoted = true;
                }
                $newBoard[$landRow][$landCol] = $newPiece;

                $step = ['row' => $landRow, 'col' => $landCol];

                if ($promoted) {
                    $sequences[] = [$step];

                    continue;
                }

                $continuations = $this->generateCaptureSequences($newBoard, $landRow, $landCol, $newPiece, $player);
                if (count($continuations) === 0) {
                    $sequences[] = [$step];
                } else {
                    foreach ($continuations as $continuation) {
                        $sequences[] = array_merge([$step], $continuation);
                    }
                }
            }
        }

        return $sequences;
    }

    private function pathsEqual(array $pathA, array $pathB): bool
    {
        if (count($pathA) !== count($pathB)) {
            return false;
        }
        foreach ($pathA as $index => $step) {
            if ($step['row'] !== $pathB[$index]['row'] || $step['col'] !== $pathB[$index]['col']) {
                return false;
            }
        }

        return true;
    }
}
