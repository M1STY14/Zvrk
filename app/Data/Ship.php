<?php

namespace App\Data;

use App\Enums\BattleshipShip;
use Illuminate\Support\Collection;
use Spatie\LaravelData\Data;

final class Ship extends Data
{
    /**
     * @param  Collection<int, Cell>  $cells
     */
    public function __construct(
        public BattleshipShip $name,
        public Collection $cells,
    ) {}

    public function size(): int
    {
        return $this->cells->count();
    }

    public function occupies(Cell $cell): bool
    {
        return $this->cells->contains(fn (Cell $own): bool => $own->equals($cell));
    }

    /**
     * @param  Collection<string, true>  $hitKeys  Keyed by cell key.
     */
    public function isSunkBy(Collection $hitKeys): bool
    {
        return $this->cells->every(fn (Cell $cell): bool => $hitKeys->has($cell->key()));
    }

    /**
     * @return Collection<int, string>
     */
    public function cellKeys(): Collection
    {
        return $this->cells->map(fn (Cell $cell): string => $cell->key());
    }
}
