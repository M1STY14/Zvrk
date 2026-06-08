<?php

namespace App\Data;

use App\Enums\SnapsRank;
use App\Enums\SnapsSuit;
use Illuminate\Support\Collection;

final class SnapsCard
{
    private const CARD_PARTS = 2;
    private const TRUMP_MARRIAGE_POINTS = 40;
    private const NON_TRUMP_MARRIAGE_POINTS = 20;

    public function __construct(
        public SnapsSuit $suit,
        public SnapsRank $rank,
    ) {}

    public static function fromString(string $card): self
    {
        [$suit, $rank] = explode('-', $card, self::CARD_PARTS);

        return new self(
            SnapsSuit::from($suit),
            SnapsRank::from($rank),
        );
    }

    public function isMarriage(?SnapsCard ...$otherCards): bool
    {
        if (!($this->rank === SnapsRank::King || $this->rank === SnapsRank::Queen)) {
            return false;
        }

        foreach ($otherCards as $card) {
            if ($card->suit === $this->suit && (
                ($this->rank === SnapsRank::King && $card->rank === SnapsRank::Queen) ||
                ($this->rank === SnapsRank::Queen && $card->rank === SnapsRank::King)
            )) {
                return true;
            }
        }

        return false;
    }

    public function beats(SnapsCard $other, SnapsCard $trumpCard): bool
    {
        if ($this->suit === $other->suit) {
            return $this->rank->order() > $other->rank->order();
        }

        if ($this->isTrump($trumpCard) && !$other->isTrump($trumpCard)) {
            return true;
        }

        return false;
    }

    public function isTrump(SnapsCard $trumpCard): bool
    {
        return $this->suit === $trumpCard->suit;
    }

    public function value(): int
    {
        return $this->rank->cardValue();
    }

    public static function createDeck(): Collection
    {
        $deck = collect();

        foreach (SnapsSuit::cases() as $suit) {
            foreach (SnapsRank::cases() as $rank) {
                $deck->push(new self($suit, $rank));
            }
        }

        return $deck->shuffle();
    }

    public function marriagePoints(SnapsCard $trumpCard): int
    {
        return $this->isTrump($trumpCard) ? self::TRUMP_MARRIAGE_POINTS : self::NON_TRUMP_MARRIAGE_POINTS;
    }
}
