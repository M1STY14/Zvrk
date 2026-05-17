<?php

namespace App\Enums;

use App\CompareEnumTrait;
use App\Models\GameSession;

/**
 * @property-read string $value
 * @property-read string $name
 */
enum GameType: string
{
    use CompareEnumTrait;
    case TicTacToe = 'tic-tac-toe';
    case Ludo = 'ludo';
    case Checkers = 'checkers';
    case FourInARow = 'four-in-a-row';

    /** In-game UI page. Custom layouts must wire `useGameChannel` (JS) for disconnect UI; default is `Game/Play`. */
    public static function getInertiaPageFrom(GameSession $gameSession): string
    {
        return match (GameType::from($gameSession->game->slug)) {
            GameType::Ludo => 'Game/LudoPlay',
            default => 'Game/Play',
        };
    }
}
