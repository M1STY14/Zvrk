<?php

namespace App\Enums;

/**
 * @property-read string $value
 * @property-read string $name
 */

enum GameStatus: string
{
    case Waiting = 'waiting';
    case Playing = 'playing';
    case Finished = 'finished';
    case Abandoned = 'abandoned';
}
