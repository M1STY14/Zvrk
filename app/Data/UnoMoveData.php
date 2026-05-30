<?php

namespace App\Data;

final class UnoMoveData extends MoveData
{
    public function __construct(
        public ?int $cardIndex = null,
        public ?string $action = null,
        public ?string $wildColor = null,
    ) {}
}