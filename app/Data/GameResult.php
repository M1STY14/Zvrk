<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class GameResult extends Data
{
    public function __construct(
        public ?int $winner,
        public bool $draw,
    ) {}
}
