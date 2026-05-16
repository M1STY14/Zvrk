<?php

namespace App\Enums;

use App\CompareEnumTrait;

/**
 * @property-read string $value
 * @property-read string $name
 */
enum GameStatus: string
{
    use CompareEnumTrait;
    case Pending = 'pending';
    case Playing = 'playing';
    case Finished = 'finished';
    case Abandoned = 'abandoned';

    public function isFinished(): bool
    {
        return $this->is(GameStatus::Finished) || $this->is(GameStatus::Abandoned);
    }
}
