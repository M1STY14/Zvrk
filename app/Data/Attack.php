<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class Attack extends Data
{
    public function __construct(
        public int $row,
        public int $col,
        public bool $hit,
    ) {}

    public function cell(): Cell
    {
        return new Cell($this->row, $this->col);
    }
}
