<?php

namespace App\Data;

use App\Enums\BelaConstants;
use App\Enums\BelaPhase;
use Illuminate\Support\Collection;

final class BelaState extends GameState
{
    /**
     * @param  int[]  $forfeited  Player numbers that forfeited.
     */
    public function __construct(
        public array $hands,
        public array $trick,
        public array $trickHistory,
        public ?string $trumpSuit,
        public ?int $trumpCaller,
        public array $teamScores,
        public array $roundPoints,
        public string $phase,
        public int $round,
        public array $declarations,
        public int $currentTurn,
        public int $dealer,
        public ?string $turnedUpCard,
        public Collection $players,
        public array $declarationChoices = [],
        public array $bids = [],
        public array $forfeited = [],
    ) {}

    public function copyWith(array $changes): self
    {
        return new self(
            $changes['hands'] ?? $this->hands,
            $changes['trick'] ?? $this->trick,
            $changes['trickHistory'] ?? $this->trickHistory,
            $changes['trumpSuit'] ?? $this->trumpSuit,
            $changes['trumpCaller'] ?? $this->trumpCaller,
            $changes['teamScores'] ?? $this->teamScores,
            $changes['roundPoints'] ?? $this->roundPoints,
            $changes['phase'] ?? $this->phase,
            $changes['round'] ?? $this->round,
            $changes['declarations'] ?? $this->declarations,
            $changes['currentTurn'] ?? $this->currentTurn,
            $changes['dealer'] ?? $this->dealer,
            $changes['turnedUpCard'] ?? $this->turnedUpCard,
            $changes['players'] ?? $this->players,
            $changes['declarationChoices'] ?? $this->declarationChoices,
            $changes['bids'] ?? $this->bids,
            $changes['forfeited'] ?? $this->forfeited,
        );
    }

    public function toBroadcastArray(): array
    {
        $data = $this->toArray();
        $data['hands'] = array_map('count', $this->hands);

        return $data;
    }

    public function stateForPlayer(int $playerNumber): array
    {
        $data = $this->toArray();

        // Remove raw hands because they contain integers
        unset($data['hands']);

        $ownHand = $this->hands[$playerNumber] ?? [];

        // Build visible hand (with hidden placeholders during bidding)
        if ($this->phase === BelaPhase::Bid->value) {
            $visibleCount = BelaConstants::VISIBLE_CARDS_PER_PLAYER;

            $visibleHand = [];

            foreach ($ownHand as $index => $card) {
                if ($index < $visibleCount) {
                    $visibleHand[] = $card;
                } else {
                    $visibleHand[] = '__HIDDEN__';
                }
            }
        } else {
            $visibleHand = $ownHand;
        }

        // Build NEW hands array from scratch
        $newHands = [];

        foreach ($this->players as $num => $playerId) {
            if ((int)$num === $playerNumber) {
                $newHands[$num] = $visibleHand;
            } else {
                $newHands[$num] = [];
            }
        }

        $data['hands'] = $newHands;

        return $data;
    }
}