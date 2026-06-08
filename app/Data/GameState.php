<?php

namespace App\Data;

use Spatie\LaravelData\Data;

abstract class GameState extends Data
{
    public function toBroadcastArray(): array
    {
        return $this->toArray();
    }

    public function stateForPlayer(int $playerNumber): array
    {
        return $this->toArray();
    }
}
