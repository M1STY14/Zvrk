<?php

namespace App\Enums;

enum SnapsRank: string
{
    case Ace = 'A';
    case Ten = '10';
    case King = 'K';
    case Queen = 'Q';
    case Jack = 'J';

    // Rank order values (higher = better)
    private const ACE_ORDER = 5;
    private const TEN_ORDER = 4;
    private const KING_ORDER = 3;
    private const QUEEN_ORDER = 2;
    private const JACK_ORDER = 1;

    public function order(): int
    {
        return match ($this) {
            self::Ace => self::ACE_ORDER,
            self::Ten => self::TEN_ORDER,
            self::King => self::KING_ORDER,
            self::Queen => self::QUEEN_ORDER,
            self::Jack => self::JACK_ORDER,
        };
    }

    // Card point values
    private const ACE_VALUE = 11;
    private const TEN_VALUE = 10;
    private const KING_VALUE = 4;
    private const QUEEN_VALUE = 3;
    private const JACK_VALUE = 2;

    public function cardValue(): int
    {
        return match ($this) {
            self::Ace => self::ACE_VALUE,
            self::Ten => self::TEN_VALUE,
            self::King => self::KING_VALUE,
            self::Queen => self::QUEEN_VALUE,
            self::Jack => self::JACK_VALUE,
        };
    }
}
