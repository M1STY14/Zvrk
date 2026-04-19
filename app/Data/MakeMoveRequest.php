<?php

namespace App\Data;

use Spatie\LaravelData\Data;

final class MakeMoveRequest extends Data
{
    public function __construct(
        /** @var array<string, mixed> */
        public array $move_data,
    ) {}
}
