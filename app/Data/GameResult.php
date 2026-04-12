<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class GameResult extends Data
{
    public function __construct(
        public ?string $winner,
        public bool $draw,
    ) {}
}
