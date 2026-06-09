<?php

namespace App\Data;

use App\Enums\BattleshipShip;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;

final class BattleshipBoardState extends Data
{
    /**
     * @param  Collection<int, Ship>  $ships
     * @param  Collection<int, Attack>  $attacks  Shots fired at this board.
     */
    public function __construct(
        public Collection $ships,
        public Collection $attacks,
        public bool $ready,
    ) {}

    public static function blank(): self
    {
        return new self(ships: collect(), attacks: collect(), ready: false);
    }

    /**
     * Cell keys of every landed hit on this board.
     *
     * @return Collection<string, true>
     */
    public function hitKeys(): Collection
    {
        return $this->attacks
            ->filter(fn (Attack $attack): bool => $attack->hit)
            ->mapWithKeys(fn (Attack $attack): array => [$attack->cell()->key() => true]);
    }

    /**
     * Cell keys occupied by ships, optionally ignoring one ship (e.g. the one being repositioned).
     *
     * @return Collection<string, true>
     */
    public function occupiedKeys(?BattleshipShip $ignore = null): Collection
    {
        return $this->ships
            ->reject(fn (Ship $ship): bool => $ignore !== null && $ship->name === $ignore)
            ->flatMap(fn (Ship $ship): Collection => $ship->cellKeys())
            ->mapWithKeys(fn (string $key): array => [$key => true]);
    }

    public function hasShipAt(Cell $cell): bool
    {
        return $this->ships->contains(fn (Ship $ship): bool => $ship->occupies($cell));
    }

    public function wasAttackedAt(Cell $cell): bool
    {
        return $this->attacks->contains(fn (Attack $attack): bool => $attack->cell()->equals($cell));
    }

    public function totalShipCells(): int
    {
        return $this->ships->sum(fn (Ship $ship): int => $ship->size());
    }

    public function landedHitCount(): int
    {
        return $this->hitKeys()->count();
    }

    public function fleetSunk(): bool
    {
        return $this->totalShipCells() > 0 && $this->landedHitCount() >= $this->totalShipCells();
    }

    /**
     * @return Collection<int, BattleshipShip>
     */
    public function placedShips(): Collection
    {
        return $this->ships->map(fn (Ship $ship): BattleshipShip => $ship->name);
    }

    public function hasFullFleet(): bool
    {
        return $this->placedShips()->unique()->count() === BattleshipShip::fleetCount();
    }

    /**
     * @return Collection<int, Ship>
     */
    public function sunkShips(): Collection
    {
        $hitKeys = $this->hitKeys();

        return $this->ships->filter(fn (Ship $ship): bool => $ship->isSunkBy($hitKeys))->values();
    }

    /** Add or reposition a ship (a ship of the same type replaces the previous one). */
    public function placeShip(Ship $ship): self
    {
        $ships = $this->ships
            ->reject(fn (Ship $existing): bool => $existing->name === $ship->name)
            ->push($ship)
            ->values();

        return new self(ships: $ships, attacks: $this->attacks, ready: $this->ready);
    }

    public function withAttack(Attack $attack): self
    {
        return new self(
            ships: $this->ships,
            attacks: collect($this->attacks)->push($attack)->values(),
            ready: $this->ready,
        );
    }

    public function markReady(): self
    {
        return new self(ships: $this->ships, attacks: $this->attacks, ready: true);
    }
}
