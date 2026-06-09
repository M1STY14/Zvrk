<?php

namespace App\Enums;

enum BelaMoveType: string
{
    case Bid = 'bid';
    case Declare = 'declare';
    case Play = 'play';
}
