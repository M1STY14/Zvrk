<?php

namespace App\Enums;

enum BattleshipPhase: string
{
    case Placement = 'placement';
    case Attack = 'attack';
}
