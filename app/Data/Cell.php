<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class Cell extends Data
{
    public function __construct(
        public int $row,
        public int $col,
    ) {}

    /** Stable string identity for use as a lookup key. */
    public function key(): string
    {
        return "{$this->row},{$this->col}";
    }

    public function equals(self $other): bool
    {
        return $this->row === $other->row && $this->col === $other->col;
    }

    public function isWithin(int $gridSize): bool
    {
        return $this->row >= 0 && $this->row < $gridSize
            && $this->col >= 0 && $this->col < $gridSize;
    }
}
