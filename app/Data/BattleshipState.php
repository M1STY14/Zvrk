<?php

namespace App\Data;

use App\Enums\BattleshipPhase;
use Illuminate\Support\Collection;

final class BattleshipState extends GameState
{
    public const GRID_SIZE = 10;

    public const PLAYER_ONE = 1;

    public const PLAYER_TWO = 2;

    /**
     * @param  Collection<int, BattleshipBoardState>  $boards  Keyed by player number.
     * @param  Collection<int, string>  $players  Keyed by player number.
     * @param  int[]  $forfeited
     */
    public function __construct(
        public BattleshipPhase $phase,
        public Collection $boards,
        public int $currentTurn,
        public Collection $players,
        public array $forfeited = [],
    ) {}

    public function board(int $playerNumber): ?BattleshipBoardState
    {
        return $this->boards->get($playerNumber);
    }

    public function opponentOf(int $playerNumber): int
    {
        return $playerNumber === self::PLAYER_ONE ? self::PLAYER_TWO : self::PLAYER_ONE;
    }

    public function bothPlayersReady(): bool
    {
        return $this->boards->every(fn (BattleshipBoardState $board): bool => $board->ready);
    }

    /** Immutable copy with selected fields overridden. */
    public function copyWith(
        ?BattleshipPhase $phase = null,
        ?Collection $boards = null,
        ?int $currentTurn = null,
        ?array $forfeited = null,
    ): self {
        return new self(
            phase: $phase ?? $this->phase,
            boards: $boards ?? $this->boards,
            currentTurn: $currentTurn ?? $this->currentTurn,
            players: $this->players,
            forfeited: $forfeited ?? $this->forfeited,
        );
    }

    /** Immutable copy with a single board replaced (keys preserved). */
    public function withBoard(int $playerNumber, BattleshipBoardState $board): self
    {
        return $this->copyWith(
            boards: $this->boards->map(
                fn (BattleshipBoardState $existing, int $number): BattleshipBoardState => $number === $playerNumber ? $board : $existing,
            ),
        );
    }

    /**
     * Public view broadcast to every player. Never reveals un-sunk ship positions.
     */
    public function toBroadcastArray(): array
    {
        return $this->viewWith(fn (): Collection => $this->boards->map(
            fn (BattleshipBoardState $board): array => $this->publicBoardView($board),
        ));
    }

    /**
     * Player-specific view — reveals only the requesting player's own ships.
     */
    public function stateForPlayer(int $playerNumber): array
    {
        return $this->viewWith(fn (): Collection => $this->boards->map(
            function (BattleshipBoardState $board, int $number) use ($playerNumber): array {
                $view = $this->publicBoardView($board);

                if ($number === $playerNumber) {
                    $view['ships'] = $board->ships->toArray();
                }

                return $view;
            },
        ));
    }

    /**
     * @param  callable(): Collection<int, array>  $boards
     */
    private function viewWith(callable $boards): array
    {
        $data = $this->toArray();
        $data['boards'] = $boards()->all();

        return $data;
    }

    /**
     * @return array{attacks: array, ready: bool, placedCount: int, fleet: array, sunkCells: array}
     */
    private function publicBoardView(BattleshipBoardState $board): array
    {
        $hitKeys = $board->hitKeys();

        return [
            'attacks' => $board->attacks->toArray(),
            'ready' => $board->ready,
            'placedCount' => $board->ships->count(),
            'fleet' => $board->ships->map(fn (Ship $ship): array => [
                'name' => $ship->name->value,
                'size' => $ship->size(),
                'sunk' => $ship->isSunkBy($hitKeys),
            ])->values()->toArray(),
            'sunkCells' => $board->sunkShips()->flatMap(fn (Ship $ship): Collection => $ship->cells)->toArray(),
        ];
    }
}
