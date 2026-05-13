<?php

namespace App\Enums;

use App\CompareEnumTrait;

/**
 * @property-read string $value
 * @property-read string $name
 */
enum LudoPhase: string
{
    use CompareEnumTrait;
    case Roll = 'roll';
    case Move = 'move';
}
