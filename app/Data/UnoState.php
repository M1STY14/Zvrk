<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class UnoState extends GameState
{
    /**
     * @param  array<int, array<int, array{color: string, type: string, value: int|null}>>  $hands  Keyed by player number.
     * @param  array<int, array{color: string, type: string, value: int|null}>  $drawPile
     * @param  array<int, array{color: string, type: string, value: int|null}>  $discardPile
     * @param  int[]  $forfeited
     */
    public function __construct(
        public array $hands,
        public array $drawPile,
        public array $discardPile,
        public int $currentTurn,
        public int $direction,
        public string $currentColor,
        public Collection $players,
        public array $forfeited = [],
        public bool $drewThisTurn = false,
    ) {}

    /** Returns only the public view — used for WebSocket broadcasts. */
    public function publicBroadcast(): array
    {
        $data = $this->toArray();
        $data['hands'] = array_map('count', $this->hands);
        $data['drawPile'] = count($this->drawPile);

        return $data;
    }

    /** Returns a player-specific view — used for HTTP responses and page loads. */
    public function stateForPlayer(int $playerNumber): array
    {
        $data = $this->toArray();
        $data['ownHand'] = $this->hands[$playerNumber] ?? [];
        $data['opponentHandSizes'] = collect($this->hands)
            ->filter(fn ($hand, $num) => (int) $num !== $playerNumber)
            ->map(fn ($hand) => count($hand))
            ->all();
        unset($data['hands']);
        $data['drawPileCount'] = count($this->drawPile);
        unset($data['drawPile']);
        $data['discardPileTop'] = ! empty($this->discardPile) ? $this->discardPile[array_key_last($this->discardPile)] : null;
        unset($data['discardPile']);

        return $data;
    }
}