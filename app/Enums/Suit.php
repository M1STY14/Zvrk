<?php

namespace App\Enums;

use InvalidArgumentException;

enum Suit: string
{
    case Clubs = 'clubs';
    case Diamonds = 'diamonds';
    case Hearts = 'hearts';
    case Spades = 'spades';

    public static function fromString(string $suit): self
    {
        return match ($suit) {
            'clubs' => self::Clubs,
            'diamonds' => self::Diamonds,
            'hearts' => self::Hearts,
            'spades' => self::Spades,
            default => throw new InvalidArgumentException("Invalid suit: {$suit}"),
        };
    }

    public static function values(): array
    {
        return array_map(fn (self $suit): string => $suit->value, self::cases());
    }
}
