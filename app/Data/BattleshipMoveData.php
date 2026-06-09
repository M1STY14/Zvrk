<?php

namespace App\Data;

use App\Enums\BattleshipAction;
use App\Enums\BattleshipOrientation;
use App\Enums\BattleshipShip;
use Illuminate\Support\Collection;

final class BattleshipMoveData extends MoveData
{
    /**
     * Placement phase:
     *   - Place:      a single ship via {ship, row, col, orientation}
     *   - PlaceFleet: the whole fleet at once via {ships}
     *   - Ready:      confirm the current placement
     * Attack phase:
     *   - Attack:     fire at {row, col}
     *
     * @param  Collection<int, ShipPlacement|null>|null  $ships
     */
    public function __construct(
        public ?BattleshipAction $action = null,
        public ?BattleshipShip $ship = null,
        public ?int $row = null,
        public ?int $col = null,
        public ?BattleshipOrientation $orientation = null,
        public ?Collection $ships = null,
    ) {}

    public function cell(): ?Cell
    {
        return $this->row !== null && $this->col !== null
            ? new Cell($this->row, $this->col)
            : null;
    }

    public function placement(): ?ShipPlacement
    {
        if ($this->ship === null || $this->orientation === null || $this->row === null || $this->col === null) {
            return null;
        }

        return new ShipPlacement(
            ship: $this->ship,
            row: $this->row,
            col: $this->col,
            orientation: $this->orientation,
        );
    }
}
