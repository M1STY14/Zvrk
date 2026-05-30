<?php

namespace App\Data;

final class ConnectFourMoveData extends MoveData
{
    public function __construct(
        public int $col,
    ) {}
}

