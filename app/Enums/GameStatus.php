<?php

namespace App\Enums;

/**
 * @property-read string $value
 * @property-read string $name
 */

enum GameStatus: string
{
    case Pending = 'pending';
    case Playing = 'playing';
    case Finished = 'finished';
    case Abandoned = 'abandoned';

    public function is(self $type): bool
    {
        return $this === $type;
    }

    public function isNot(self $type): bool
    {
        return $this !== $type;
    }
}
