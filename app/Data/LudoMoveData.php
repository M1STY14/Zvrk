<?php

namespace App\Data;

final class LudoMoveData extends MoveData
{
    public function __construct(
        public ?string $action,
        public ?int $tokenIndex,
        public ?int $diceValue,
    ) {}
}
