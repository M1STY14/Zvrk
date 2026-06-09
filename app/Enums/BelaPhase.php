<?php

namespace App\Enums;

enum BelaPhase: string
{
    case Bid = 'bid';
    case Play = 'play';
    case Score = 'score';
}
