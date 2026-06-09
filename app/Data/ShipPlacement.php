<?php

namespace App\Data;

use App\Enums\BattleshipOrientation;
use App\Enums\BattleshipShip;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;

final class ShipPlacement extends Data
{
    public function __construct(
        public BattleshipShip $ship,
        public int $row,
        public int $col,
        public BattleshipOrientation $orientation,
    ) {}

    /**
     * The concrete cells this placement would occupy.
     *
     * @return Collection<int, Cell>
     */
    public function cells(): Collection
    {
        return collect(range(0, $this->ship->size() - 1))->map(
            fn (int $offset): Cell => $this->orientation === BattleshipOrientation::Horizontal
                ? new Cell($this->row, $this->col + $offset)
                : new Cell($this->row + $offset, $this->col),
        );
    }

    public function toShip(): Ship
    {
        return new Ship(name: $this->ship, cells: $this->cells());
    }
}
