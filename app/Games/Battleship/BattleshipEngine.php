<?php

namespace App\Games\Battleship;

use App\Contracts\GameContract;
use App\Data\Attack;
use App\Data\BattleshipMoveData;
use App\Data\BattleshipState;
use App\Data\BattleshipBoardState;
use App\Data\Cell;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Data\Ship;
use App\Data\ShipPlacement;
use App\Enums\BattleshipAction;
use App\Enums\BattleshipOrientation;
use App\Enums\BattleshipPhase;
use App\Enums\BattleshipShip;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class BattleshipEngine implements GameContract
{
    public function initialState(Collection $players): GameState
    {
        if ($players->count() < 2) {
            throw new InvalidArgumentException('Battleship requires exactly two players.');
        }

        return new BattleshipState(
            phase: BattleshipPhase::Placement,
            boards: collect([
                BattleshipState::PLAYER_ONE => BattleshipBoardState::blank(),
                BattleshipState::PLAYER_TWO => BattleshipBoardState::blank(),
            ]),
            currentTurn: BattleshipState::PLAYER_ONE,
            players: collect([
                BattleshipState::PLAYER_ONE => $players->get(0),
                BattleshipState::PLAYER_TWO => $players->get(1),
            ]),
        );
    }

    public function makeState(array $data): GameState
    {
        return new BattleshipState(
            phase: BattleshipPhase::from($data['phase']),
            boards: collect($data['boards'])->map(fn (array $board): BattleshipBoardState => $this->makeBoard($board)),
            currentTurn: $data['currentTurn'],
            players: collect($data['players']),
            forfeited: $data['forfeited'],
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new BattleshipMoveData(
            action: BattleshipAction::tryFrom($data['action'] ?? ''),
            ship: isset($data['ship']) ? BattleshipShip::tryFrom($data['ship']) : null,
            row: $data['row'] ?? null,
            col: $data['col'] ?? null,
            orientation: isset($data['orientation']) ? BattleshipOrientation::tryFrom($data['orientation']) : null,
            ships: isset($data['ships'])
                ? collect($data['ships'])->map(fn (array $placement): ?ShipPlacement => $this->makePlacement($placement))
                : null,
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        return $this->ensureState($state)->currentTurn;
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        $state = $this->ensureState($state);
        $moveData = $this->ensureMoveData($moveData);

        $board = $state->board($playerNumber);

        if ($board === null) {
            return false;
        }

        return $state->phase === BattleshipPhase::Placement
            ? $this->validatePlacementMove($board, $moveData)
            : $this->validateAttackMove($state, $playerNumber, $moveData);
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        $state = $this->ensureState($state);
        $moveData = $this->ensureMoveData($moveData);

        return $state->phase === BattleshipPhase::Placement
            ? $this->applyPlacementMove($state, $playerNumber, $moveData)
            : $this->applyAttackMove($state, $playerNumber, $moveData);
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        $state = $this->ensureState($state);

        if ($state->phase !== BattleshipPhase::Attack) {
            return null;
        }

        foreach ($state->boards as $playerNumber => $board) {
            if ($board->fleetSunk()) {
                return new GameResult(
                    winner: $state->players->get($state->opponentOf($playerNumber)),
                    draw: false,
                );
            }
        }

        return null;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        $state = $this->ensureState($state);

        return $state->copyWith(
            forfeited: collect($state->forfeited)->push($playerNumber)->unique()->values()->all(),
        );
    }

    public function activePlayerNumbers(GameState $state): array
    {
        $state = $this->ensureState($state);

        return $state->players->keys()
            ->map(fn ($number): int => (int) $number)
            ->reject(fn (int $number): bool => in_array($number, $state->forfeited, true))
            ->values()
            ->all();
    }

    private function validatePlacementMove(BattleshipBoardState $board, BattleshipMoveData $moveData): bool
    {
        if ($board->ready) {
            return false;
        }

        return match ($moveData->action) {
            BattleshipAction::Place => $this->placementFits($moveData->placement(), $board->occupiedKeys($moveData->ship)),
            BattleshipAction::PlaceFleet => $this->fleetFits($moveData->ships),
            BattleshipAction::Ready => $board->hasFullFleet(),
            default => false,
        };
    }

    private function validateAttackMove(BattleshipState $state, int $playerNumber, BattleshipMoveData $moveData): bool
    {
        if ($moveData->action !== null && $moveData->action !== BattleshipAction::Attack) {
            return false;
        }

        if ($playerNumber !== $state->currentTurn || in_array($playerNumber, $state->forfeited, true)) {
            return false;
        }

        $cell = $moveData->cell();

        if ($cell === null || ! $cell->isWithin(BattleshipState::GRID_SIZE)) {
            return false;
        }

        return ! $state->board($state->opponentOf($playerNumber))->wasAttackedAt($cell);
    }

    /**
     * @param  Collection<string, true>  $occupied
     */
    private function placementFits(?ShipPlacement $placement, Collection $occupied): bool
    {
        if ($placement === null) {
            return false;
        }

        return $placement->cells()->every(fn (Cell $cell): bool => $cell->isWithin(BattleshipState::GRID_SIZE)
            && ! $occupied->has($cell->key()));
    }

    /**
     * @param  Collection<int, ShipPlacement|null>|null  $ships
     */
    private function fleetFits(?Collection $ships): bool
    {
        if ($ships === null || $ships->contains(null) || $ships->count() !== BattleshipShip::fleetCount()) {
            return false;
        }

        if ($ships->map(fn (ShipPlacement $placement): BattleshipShip => $placement->ship)->unique()->count() !== $ships->count()) {
            return false;
        }

        $occupied = collect();

        foreach ($ships as $placement) {
            if (! $this->placementFits($placement, $occupied)) {
                return false;
            }

            $occupied = $occupied->merge($placement->cells()->mapWithKeys(fn (Cell $cell): array => [$cell->key() => true]));
        }

        return true;
    }

    private function applyPlacementMove(BattleshipState $state, int $playerNumber, BattleshipMoveData $moveData): GameState
    {
        $board = $state->board($playerNumber);

        $updatedBoard = match ($moveData->action) {
            BattleshipAction::Place => $board->placeShip($moveData->placement()->toShip()),
            BattleshipAction::PlaceFleet => $this->placeFleet($board, $moveData->ships),
            BattleshipAction::Ready => $board->markReady(),
            default => throw new InvalidArgumentException('Unsupported placement action.'),
        };

        $next = $state->withBoard($playerNumber, $updatedBoard);

        return $next->bothPlayersReady()
            ? $next->copyWith(phase: BattleshipPhase::Attack, currentTurn: BattleshipState::PLAYER_ONE)
            : $next;
    }

    /**
     * Place every ship of a fleet and mark the board ready.
     *
     * @param  Collection<int, ShipPlacement>  $placements
     */
    private function placeFleet(BattleshipBoardState $board, Collection $placements): BattleshipBoardState
    {
        foreach ($placements as $placement) {
            $board = $board->placeShip($placement->toShip());
        }

        return $board->markReady();
    }

    private function applyAttackMove(BattleshipState $state, int $playerNumber, BattleshipMoveData $moveData): GameState
    {
        $opponent = $state->opponentOf($playerNumber);
        $targetBoard = $state->board($opponent);
        $cell = $moveData->cell();

        $attack = new Attack(
            row: $cell->row,
            col: $cell->col,
            hit: $targetBoard->hasShipAt($cell),
        );

        // Players always alternate turns, hit or miss.
        return $state
            ->withBoard($opponent, $targetBoard->withAttack($attack))
            ->copyWith(currentTurn: $opponent);
    }

    private function makeBoard(array $board): BattleshipBoardState
    {
        return new BattleshipBoardState(
            ships: collect($board['ships'] ?? [])->map(fn (array $ship): Ship => new Ship(
                name: BattleshipShip::from($ship['name']),
                cells: collect($ship['cells'])->map(fn (array $cell): Cell => new Cell($cell['row'], $cell['col'])),
            )),
            attacks: collect($board['attacks'] ?? [])->map(fn (array $attack): Attack => new Attack(
                row: $attack['row'],
                col: $attack['col'],
                hit: $attack['hit'],
            )),
            ready: $board['ready'] ?? false,
        );
    }

    private function makePlacement(array $data): ?ShipPlacement
    {
        $ship = isset($data['ship']) ? BattleshipShip::tryFrom($data['ship']) : null;
        $orientation = isset($data['orientation']) ? BattleshipOrientation::tryFrom($data['orientation']) : null;

        if ($ship === null || $orientation === null || ! isset($data['row'], $data['col'])
            || ! is_int($data['row']) || ! is_int($data['col'])) {
            return null;
        }

        return new ShipPlacement(ship: $ship, row: $data['row'], col: $data['col'], orientation: $orientation);
    }

    private function ensureState(GameState $state): BattleshipState
    {
        if (! $state instanceof BattleshipState) {
            throw new InvalidArgumentException('BattleshipEngine expects BattleshipState.');
        }

        return $state;
    }

    private function ensureMoveData(MoveData $moveData): BattleshipMoveData
    {
        if (! $moveData instanceof BattleshipMoveData) {
            throw new InvalidArgumentException('BattleshipEngine expects BattleshipMoveData.');
        }

        return $moveData;
    }
}
