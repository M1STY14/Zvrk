<?php

namespace App\Enums;

use InvalidArgumentException;

final class Card
{
    public function __construct(
        public BelaRank $rank,
        public Suit $suit,
    ) {}

    public static function fromString(string $card): self
    {
        $parts = explode('_of_', $card);

        if (count($parts) !== 2) {
            throw new InvalidArgumentException("Invalid card string: {$card}");
        }

        return new self(
            BelaRank::fromString($parts[0]),
            Suit::fromString($parts[1]),
        );
    }

    public static function deck(): array
    {
        $deck = [];

        foreach (Suit::cases() as $suit) {
            foreach (BelaRank::cases() as $rank) {
                $deck[] = new self($rank, $suit);
            }
        }

        return $deck;
    }

    public function toString(): string
    {
        return "{$this->rank->value}_of_{$this->suit->value}";
    }

    public function isTrump(?Suit $trumpSuit): bool
    {
        return $trumpSuit !== null && $this->suit === $trumpSuit;
    }

    public function sameSuit(Card $other): bool
    {
        return $this->suit === $other->suit;
    }
}
