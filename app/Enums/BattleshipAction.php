<?php

namespace App\Enums;

enum BattleshipAction: string
{
    /** Place or reposition a single ship. */
    case Place = 'place';
    /** Place the whole fleet at once and confirm. */
    case PlaceFleet = 'place_fleet';
    /** Confirm the current placement. */
    case Ready = 'ready';
    /** Fire at an opponent coordinate. */
    case Attack = 'attack';
}
