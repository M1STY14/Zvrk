<?php

namespace App\Games;

use App\Contracts\GameContract;
use App\Data\ConnectFourMoveData;
use App\Data\ConnectFourState;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class ConnectFourEngine implements GameContract
{
    private const ROWS = 6;

    private const COLS = 7;

    public function initialState(Collection $players): GameState
    {
        if ($players->count() < 2) {
            throw new InvalidArgumentException('Connect Four requires exactly two players.');
        }

        $board = array_fill(0, self::ROWS, array_fill(0, self::COLS, 0));

        return new ConnectFourState(
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
        return new ConnectFourState(
            board: $data['board'],
            currentTurn: $data['currentTurn'],
            players: collect($data['players']),
            forfeited: $data['forfeited'] ?? [],
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new ConnectFourMoveData(
            col: $data['col'],
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        if (! $moveData instanceof ConnectFourMoveData) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        if ($moveData->col < 0 || $moveData->col >= self::COLS) {
            return false;
        }

        return $state->board[0][$moveData->col] === 0;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        if (! $moveData instanceof ConnectFourMoveData) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourMoveData.');
        }

        $board = $state->board;
        $row = $this->findDropRow($board, $moveData->col);

        if ($row === null) {
            throw new InvalidArgumentException('Cannot apply move in a full column.');
        }

        $board[$row][$moveData->col] = $playerNumber;

        return new ConnectFourState(
            board: $board,
            currentTurn: $playerNumber === 1 ? 2 : 1,
            players: $state->players,
            forfeited: $state->forfeited,
        );
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        $board = $state->board;

        for ($row = 0; $row < self::ROWS; $row++) {
            for ($col = 0; $col < self::COLS; $col++) {
                $token = $board[$row][$col];

                if ($token === 0) {
                    continue;
                }

                if (
                    $this->hasLine($board, $row, $col, 0, 1, $token)
                    || $this->hasLine($board, $row, $col, 1, 0, $token)
                    || $this->hasLine($board, $row, $col, 1, 1, $token)
                    || $this->hasLine($board, $row, $col, 1, -1, $token)
                ) {
                    return new GameResult(
                        winner: $state->players->get($token),
                        draw: false,
                    );
                }
            }
        }

        foreach ($board as $row) {
            if (in_array(0, $row, true)) {
                return null;
            }
        }

        return new GameResult(
            winner: null,
            draw: true,
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        return $state->currentTurn;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        return new ConnectFourState(
            board: $state->board,
            currentTurn: $state->currentTurn,
            players: $state->players,
            forfeited: array_values(array_unique([...$state->forfeited, $playerNumber])),
        );
    }

    public function activePlayerNumbers(GameState $state): array
    {
        if (! $state instanceof ConnectFourState) {
            throw new InvalidArgumentException('ConnectFourEngine expects ConnectFourState.');
        }

        return $state->players->keys()
            ->map(fn ($number): int => (int) $number)
            ->reject(fn (int $number): bool => in_array($number, $state->forfeited, true))
            ->values()
            ->all();
    }

    private function findDropRow(array $board, int $col): ?int
    {
        for ($row = self::ROWS - 1; $row >= 0; $row--) {
            if ($board[$row][$col] === 0) {
                return $row;
            }
        }

        return null;
    }

    private function hasLine(array $board, int $row, int $col, int $dRow, int $dCol, int $token): bool
    {
        for ($i = 1; $i < 4; $i++) {
            $nextRow = $row + ($dRow * $i);
            $nextCol = $col + ($dCol * $i);

            if (
                $nextRow < 0 || $nextRow >= self::ROWS
                || $nextCol < 0 || $nextCol >= self::COLS
                || $board[$nextRow][$nextCol] !== $token
            ) {
                return false;
            }
        }

        return true;
    }
}

