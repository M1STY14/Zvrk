<?php

namespace App\Data;

final class TicTacToeMoveData extends MoveData
{
    public function __construct(
        public int $row,
        public int $col,
    ) {}
}