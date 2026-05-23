<?php

namespace App\StateMachines;

use App\Enums\GameStatus;
use App\Support\StateMachines\StateMachine;

final class GameSessionStatusStateMachine extends StateMachine
{
    public function recordHistory(): bool
    {
        return true;
    }

    public function transitions(): array
    {
        return [
            GameStatus::Pending->value => [GameStatus::Playing, GameStatus::Canceled],
            GameStatus::Playing->value => [GameStatus::Finished, GameStatus::Forfeited],
        ];
    }

    public function defaultState(): ?string
    {
        return GameStatus::Pending->value;
    }
}
