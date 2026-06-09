<?php

namespace App\Enums;

enum BattleshipShip: string
{
    case Carrier = 'carrier';
    case Battleship = 'battleship';
    case Cruiser = 'cruiser';
    case Submarine = 'submarine';
    case Destroyer = 'destroyer';

    /** Length of the ship in cells. */
    public function size(): int
    {
        return match ($this) {
            self::Carrier => 5,
            self::Battleship => 4,
            self::Cruiser => 3,
            self::Submarine => 3,
            self::Destroyer => 2,
        };
    }

    /** Number of distinct ships in a complete fleet. */
    public static function fleetCount(): int
    {
        return count(self::cases());
    }
}
