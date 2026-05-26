<?php

namespace App\Data;

final class CheckersMoveData extends MoveData
{
    public function __construct(
        public array $from,
        public array $path,
    ) {}
}
