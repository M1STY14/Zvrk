<?php

namespace App\Data;

final class SnapsMoveData extends MoveData
{
    public function __construct(
        public ?SnapsCard $card = null,
        public bool $draw = false,
        public bool $declareMarriage = false,
        public bool $close = false,
        public bool $swapTrump = false,
    ) {}
}
