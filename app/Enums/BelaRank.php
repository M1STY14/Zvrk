<?php

namespace App\Enums;

use InvalidArgumentException;

enum BelaRank: string
{
    case Seven = '7';
    case Eight = '8';
    case Nine = '9';
    case Jack = 'jack';
    case Queen = 'queen';
    case King = 'king';
    case Ten = '10';
    case Ace = 'ace';

    public static function fromString(string $rank): self
    {
        return match ($rank) {
            '7' => self::Seven,
            '8' => self::Eight,
            '9' => self::Nine,
            'jack' => self::Jack,
            'queen' => self::Queen,
            'king' => self::King,
            '10' => self::Ten,
            'ace' => self::Ace,
            default => throw new InvalidArgumentException("Invalid rank: {$rank}"),
        };
    }

    public function order(): int
    {
        return match ($this) {
            self::Seven => 0,
            self::Eight => 1,
            self::Nine => 2,
            self::Jack => 3,
            self::Queen => 4,
            self::King => 5,
            self::Ten => 6,
            self::Ace => 7,
        };
    }

    public function trumpRankValue(): int
    {
        return match ($this) {
            self::Seven => 0,
            self::Eight => 1,
            self::Nine => 6,
            self::Jack => 7,
            self::Queen => 2,
            self::King => 3,
            self::Ten => 4,
            self::Ace => 5,
        };
    }

    public function nonTrumpRankValue(): int
    {
        return match ($this) {
            self::Seven => 0,
            self::Eight => 1,
            self::Nine => 2,
            self::Jack => 3,
            self::Queen => 4,
            self::King => 5,
            self::Ten => 6,
            self::Ace => 7,
        };
    }

    public function trumpPointValue(): int
    {
        return match ($this) {
            self::Seven => 0,
            self::Eight => 0,
            self::Nine => 14,
            self::Jack => 20,
            self::Queen => 3,
            self::King => 4,
            self::Ten => 10,
            self::Ace => 11,
        };
    }

    public function nonTrumpPointValue(): int
    {
        return match ($this) {
            self::Seven => 0,
            self::Eight => 0,
            self::Nine => 0,
            self::Jack => 2,
            self::Queen => 3,
            self::King => 4,
            self::Ten => 10,
            self::Ace => 11,
        };
    }

    public function fourOfAKindDeclarationPoints(): int
    {
        return match ($this) {
            self::Jack => 200,
            self::Nine => 150,
            default => 100,
        };
    }
}
