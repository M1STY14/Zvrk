<?php

namespace App\Enums;

/**
 * @property-read string $value
 * @property-read string $name
 */

enum GameType: string
{
    case TicTacToe = 'tic-tac-toe';
    case Ludo = 'ludo';
    case Checkers = 'checkers';
    case FourInARow = 'four-in-a-row';
}
