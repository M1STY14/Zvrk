<?php

namespace App\Enums;

/**
 * @property-read string $value
 * @property-read string $name
 */
enum LudoPhase: string
{
    case Roll = 'roll';
    case Move = 'move';
}
