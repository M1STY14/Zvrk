<?php

namespace App\Data;

use Illuminate\Support\Collection;

final class SnapsState extends GameState
{
    public function __construct(
        public Collection $players,
        public int $currentTurn,
        public Collection $hands,
        public Collection $stock,
        public SnapsCard $trumpCard,
        public Collection $trick = new Collection,
        public Collection $capturedPoints = new Collection,
        public Collection $scores = new Collection,
        public ?int $lastTrickWinner = null,
        public Collection $drawQueue = new Collection,
        public bool $closed = false,
        public ?int $closedBy = null,
        /**
         * Points snapshot taken at the moment a player closes; used to freeze opponent's points
         * for final scoring when a close occurs.
         */
        public Collection $totalPointsAtClose = new Collection,
        /**
         * The cards of the most recently completed trick, kept so both clients can show the
         * finished trick (and who won it) before the table is swept for the next lead.
         */
        public Collection $lastTrick = new Collection,
    ) {}

    /**
     * The card value objects held in state are serialized down to their "H-A" wire
     * strings here, which is the shape the frontend and makeState() both expect.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'players' => $this->players->toArray(),
            'currentTurn' => $this->currentTurn,
            'hands' => $this->hands
                ->map(fn (Collection $hand) => $hand->map(fn (SnapsCard $card) => $card->toString())->values()->all())
                ->toArray(),
            'stock' => $this->stock->map(fn (SnapsCard $card) => $card->toString())->values()->all(),
            'trumpCard' => $this->trumpCard->toString(),
            'trick' => $this->trick
                ->map(fn (array $item) => [
                    'player' => $item['player'],
                    'card' => $item['card']->toString(),
                    'marriagePoints' => $item['marriagePoints'],
                ])
                ->values()
                ->all(),
            'lastTrick' => $this->lastTrick
                ->map(fn (array $item) => [
                    'player' => $item['player'],
                    'card' => $item['card']->toString(),
                ])
                ->values()
                ->all(),
            'capturedPoints' => $this->capturedPoints->toArray(),
            'scores' => $this->scores->toArray(),
            'lastTrickWinner' => $this->lastTrickWinner,
            'drawQueue' => $this->drawQueue->values()->all(),
            'closed' => $this->closed,
            'closedBy' => $this->closedBy,
            'totalPointsAtClose' => $this->totalPointsAtClose->toArray(),
        ];
    }
}
