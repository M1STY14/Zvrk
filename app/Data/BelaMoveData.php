<?php

namespace App\Data;

final class BelaMoveData extends MoveData
{
    public function __construct(
        public string $type,
        public ?string $card = null,
        public ?string $suit = null,
        public ?bool $pass = null,
        public ?bool $declare = null,
    ) {}
}