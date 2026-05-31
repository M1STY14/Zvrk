<?php

namespace App\Games\Snaps;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Data\SnapsMoveData;
use App\Data\SnapsState;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class SnapsEngine implements GameContract
{
    private const SUITS = ['H', 'D', 'C', 'S'];
    private const RANKS = ['A', '10', 'K', 'Q', 'J'];
    private const RANK_ORDER = [
        'A' => 5,
        '10' => 4,
        'K' => 3,
        'Q' => 2,
        'J' => 1,
    ];
    private const CARD_VALUES = [
        'A' => 11,
        '10' => 10,
        'K' => 4,
        'Q' => 3,
        'J' => 2,
    ];

    public function makeState(array $data): GameState
    {

        return new SnapsState(
            players: collect($data['players'] ?? [])->mapWithKeys(
                fn ($userId, $playerNumber) => [(int) $playerNumber => $userId],
            ),
            currentTurn: (int) $data['currentTurn'],
            hands: $data['hands'] ?? [],
            stock: $data['stock'] ?? [],
            trumpCard: $data['trumpCard'] ?? '',
            trick: $data['trick'] ?? [],
            capturedPoints: $data['capturedPoints'] ?? [1 => 0, 2 => 0],
            scores: $data['scores'] ?? [1 => 0, 2 => 0],
            lastTrickWinner: $data['lastTrickWinner'] ?? null,
            drawQueue: $data['drawQueue'] ?? [],
            closed: $data['closed'] ?? false,
            closedBy: $data['closedBy'] ?? null,
            totalPointsAtClose: $data['totalPointsAtClose'] ?? [1 => 0, 2 => 0],
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new SnapsMoveData(
            card: $data['card'] ?? null,
            draw: $data['draw'] ?? false,
            declareMarriage: $data['declare_marriage'] ?? false,
            close: $data['close'] ?? false,
            swapTrump: $data['swap_trump'] ?? false,
        );
    }

    public function initialState(Collection $players): GameState
    {
        if ($players->count() !== 2) {
            throw new InvalidArgumentException('Snaps requires exactly two players.');
        }

        return $this->dealNewHand(
            collect([1 => $players->get(0), 2 => $players->get(1)]),
            1,
            [1 => 0, 2 => 0],
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        if (! $moveData instanceof SnapsMoveData) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        if ($moveData->draw) {
            return ! empty($state->drawQueue)
                && $state->drawQueue[0] === $playerNumber
                && ! empty($state->stock);
        }

        // If there is a pending draw queue, non-draw actions are not allowed
        if (! empty($state->drawQueue)) {
            return false;
        }

        // Allow swapping the trump (jack) as a special action when conditions met
        if ($moveData->swapTrump) {
            $hand = $state->hands[$playerNumber] ?? [];
            $trumpSuit = $this->cardSuit($state->trumpCard);
            $jack = sprintf('%s-J', $trumpSuit);

            return in_array($jack, $hand, true) && ! empty($state->stock) && ! $state->closed;
        }

        // Allow closing the talon as a special action when stock is available and game not already closed
        if ($moveData->close) {
            return ! empty($state->stock) && ! $state->closed;
        }

        $hand = $state->hands[$playerNumber] ?? [];
        if (! in_array($moveData->card, $hand, true)) {
            return false;
        }

        if ($moveData->declareMarriage && ! $this->isMarriage($moveData->card, $hand)) {
            return false;
        }

        if (count($state->trick) !== 1) {
            return true;
        }

        $lead = $state->trick[0]['card'];
        $leadSuit = $this->cardSuit($lead);
        $cardSuit = $this->cardSuit($moveData->card);

        if ($this->hasSuit($hand, $leadSuit)) {
            if ($cardSuit !== $leadSuit) {
                return false;
            }

            if ($this->hasHigherSameSuit($hand, $lead, $state->trumpCard) && ! $this->cardBeats($moveData->card, $lead, $state->trumpCard)) {
                return false;
            }

            return true;
        }

        if ($this->hasSuit($hand, $this->cardSuit($state->trumpCard))) {
            if (! $this->isTrump($moveData->card, $state->trumpCard)) {
                return false;
            }

            if ($this->isTrump($lead, $state->trumpCard)
                && $this->hasHigherSameSuit($hand, $lead, $state->trumpCard)
                && ! $this->cardBeats($moveData->card, $lead, $state->trumpCard)) {
                return false;
            }
        }

        return true;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        if (! $moveData instanceof SnapsMoveData) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsMoveData.');
        }

        if ($moveData->draw) {
            $stock = $state->stock;

            if (empty($stock)) {
                throw new InvalidArgumentException('No cards left in stock.');
            }

            $drawIndex = random_int(0, count($stock) - 1);
            $drawnCard = array_splice($stock, $drawIndex, 1)[0];

            $hands = $state->hands;
            $hands[$playerNumber][] = $drawnCard;

            $drawQueue = $state->drawQueue;
            array_shift($drawQueue);

            if (empty($stock)) {
                $drawQueue = [];
                $currentTurn = $state->lastTrickWinner ?? $playerNumber;
            } else {
                $currentTurn = ! empty($drawQueue)
                    ? $drawQueue[0]
                    : $state->lastTrickWinner ?? $playerNumber;
            }

            return new SnapsState(
                players: $state->players,
                currentTurn: $currentTurn,
                hands: $hands,
                stock: $stock,
                trumpCard: $state->trumpCard,
                trick: $state->trick,
                capturedPoints: $state->capturedPoints,
                scores: $state->scores,
                lastTrickWinner: $state->lastTrickWinner,
                drawQueue: $drawQueue,
            );
        }

        // Handle special actions that don't play a card from hand
        if ($moveData->swapTrump) {
            $trumpSuit = $this->cardSuit($state->trumpCard);
            $jack = sprintf('%s-J', $trumpSuit);
            $hand = $state->hands[$playerNumber] ?? [];

            if (! in_array($jack, $hand, true)) {
                throw new InvalidArgumentException('Cannot swap trump: jack not in hand.');
            }

            // remove jack from hand and give player the face-up trump, set new trump
            $index = array_search($jack, $hand, true);
            array_splice($hand, $index, 1);
            $hand[] = $state->trumpCard;

            $hands = $state->hands;
            $hands[$playerNumber] = array_values($hand);

            return new SnapsState(
                players: $state->players,
                currentTurn: $playerNumber,
                hands: $hands,
                stock: $state->stock,
                trumpCard: $jack,
                trick: $state->trick,
                capturedPoints: $state->capturedPoints,
                scores: $state->scores,
                lastTrickWinner: $state->lastTrickWinner,
                drawQueue: $state->drawQueue,
                closed: $state->closed,
                closedBy: $state->closedBy,
                totalPointsAtClose: $state->totalPointsAtClose,
            );
        }

        if ($moveData->close) {
            if (empty($state->stock) || $state->closed) {
                throw new InvalidArgumentException('Cannot close: stock already empty or game already closed.');
            }

            // Freeze opponent points at the moment of closing
            $totalPointsAtClose = [
                1 => $this->getPlayerTotalPoints(1, $state),
                2 => $this->getPlayerTotalPoints(2, $state),
            ];

            return new SnapsState(
                players: $state->players,
                currentTurn: $playerNumber,
                hands: $state->hands,
                stock: [], // behave as if talon exhausted
                trumpCard: $state->trumpCard,
                trick: $state->trick,
                capturedPoints: $state->capturedPoints,
                scores: $state->scores,
                lastTrickWinner: $state->lastTrickWinner,
                drawQueue: [],
                closed: true,
                closedBy: $playerNumber,
                totalPointsAtClose: $totalPointsAtClose,
            );
        }

        $hands = $state->hands;
        $hand = $hands[$playerNumber] ?? [];
        $index = array_search($moveData->card, $hand, true);

        if ($index === false) {
            throw new InvalidArgumentException('Card not in hand.');
        }

        $marriagePoints = $moveData->declareMarriage && $this->isMarriage($moveData->card, $hand)
            ? $this->marriagePoints($moveData->card, $state->trumpCard)
            : 0;

        array_splice($hand, $index, 1);
        $hands[$playerNumber] = array_values($hand);

        $trick = [...$state->trick, ['player' => $playerNumber, 'card' => $moveData->card, 'marriagePoints' => $marriagePoints]];
        $currentTurn = $this->getOtherPlayer($playerNumber);
        $capturedPoints = $state->capturedPoints;
        $stock = $state->stock;
        $drawQueue = [];

        if (count($trick) === 2) {
            $trickWinner = $this->resolveTrick($trick, $state->trumpCard);
            $points = $this->cardValue($trick[0]['card']) + $this->cardValue($trick[1]['card']);
            $points += $trick[0]['marriagePoints'] + $trick[1]['marriagePoints'];
            $capturedPoints[$trickWinner] = ($capturedPoints[$trickWinner] ?? 0) + $points;

            $loser = $this->getOtherPlayer($trickWinner);
            $currentTurn = $trickWinner;
            $trick = [];
            $lastTrickWinner = $trickWinner;

            if (! empty($stock)) {
                $drawQueue = [$trickWinner, $loser];
            }
        } else {
            $lastTrickWinner = $state->lastTrickWinner;
        }

        $newState = new SnapsState(
            players: $state->players,
            currentTurn: $currentTurn,
            hands: $hands,
            stock: $stock,
            trumpCard: $state->trumpCard,
            trick: $trick,
            capturedPoints: $capturedPoints,
            scores: $state->scores,
            lastTrickWinner: $lastTrickWinner,
            drawQueue: $drawQueue,
        );

        if ($this->shouldEndDeal($newState)) {
            return $this->completeDeal($newState);
        }

        return $newState;
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        $winner = null;
        $highest = 0;

        foreach ($state->scores as $playerNumber => $score) {
            if ($score >= 501 && $score > $highest) {
                $highest = $score;
                $winner = $playerNumber;
            }
        }

        if ($winner === null) {
            return null;
        }

        return new GameResult(
            winner: $state->players[$winner],
            draw: false,
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        return $state->currentTurn;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        $currentTurn = $state->currentTurn;

        if ($currentTurn === $playerNumber) {
            $currentTurn = $this->getOtherPlayer($playerNumber);
        }

        return new SnapsState(
            players: $state->players,
            currentTurn: $currentTurn,
            hands: $state->hands,
            stock: $state->stock,
            trumpCard: $state->trumpCard,
            trick: $state->trick,
            capturedPoints: $state->capturedPoints,
            scores: $state->scores,
            lastTrickWinner: $state->lastTrickWinner,
        );
    }

    public function activePlayerNumbers(GameState $state): array
    {
        if (! $state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        return $state->players->keys()
            ->map(fn ($number): int => (int) $number)
            ->values()
            ->all();
    }

    private function createDeck(): array
    {
        $deck = [];

        foreach (self::SUITS as $suit) {
            foreach (self::RANKS as $rank) {
                $deck[] = sprintf('%s-%s', $suit, $rank);
            }
        }

        return $deck;
    }

    private function dealNewHand(Collection $players, int $startingTurn, array $scores): SnapsState
    {
        $deck = $this->createDeck();
        shuffle($deck);

        $hands = [];

        foreach ($players as $playerNumber => $playerId) {
            $hands[(int) $playerNumber] = array_splice($deck, 0, 3);
        }

        $trumpCard = array_shift($deck);

        foreach ($players as $playerNumber => $playerId) {
            $hands[(int) $playerNumber] = array_merge($hands[(int) $playerNumber], array_splice($deck, 0, 2));
        }

        return new SnapsState(
            players: $players,
            currentTurn: $startingTurn,
            hands: $hands,
            stock: $deck,
            trumpCard: $trumpCard,
            trick: [],
            capturedPoints: [1 => 0, 2 => 0],
            scores: $scores,
            lastTrickWinner: null,
            drawQueue: [],
        );
    }

    private function resolveTrick(array $trick, string $trumpCard): int
    {
        $lead = $trick[0];
        $follow = $trick[1];

        $leadCard = $lead['card'];
        $followCard = $follow['card'];

        $leadIsTrump = $this->isTrump($leadCard, $trumpCard);
        $followIsTrump = $this->isTrump($followCard, $trumpCard);

        if ($leadIsTrump && ! $followIsTrump) {
            return $lead['player'];
        }

        if (! $leadIsTrump && $followIsTrump) {
            return $follow['player'];
        }

        if ($this->cardSuit($leadCard) === $this->cardSuit($followCard)) {
            return $this->cardBeats($followCard, $leadCard, $trumpCard)
                ? $follow['player']
                : $lead['player'];
        }

        return $lead['player'];
    }

    private function cardSuit(string $card): string
    {
        return explode('-', $card, 2)[0];
    }

    private function cardRank(string $card): string
    {
        return explode('-', $card, 2)[1];
    }

    private function cardValue(string $card): int
    {
        return self::CARD_VALUES[$this->cardRank($card)] ?? 0;
    }

    private function cardOrder(string $card): int
    {
        return self::RANK_ORDER[$this->cardRank($card)] ?? 0;
    }

    private function isTrump(string $card, string $trumpCard): bool
    {
        return $this->cardSuit($card) === $this->cardSuit($trumpCard);
    }

    private function cardBeats(string $card, string $otherCard, string $trumpCard): bool
    {
        if ($this->isTrump($card, $trumpCard) && ! $this->isTrump($otherCard, $trumpCard)) {
            return true;
        }

        if (! $this->isTrump($card, $trumpCard) && $this->isTrump($otherCard, $trumpCard)) {
            return false;
        }

        if ($this->cardSuit($card) !== $this->cardSuit($otherCard)) {
            return false;
        }

        return $this->cardOrder($card) > $this->cardOrder($otherCard);
    }

    private function hasSuit(array $hand, string $suit): bool
    {
        foreach ($hand as $card) {
            if ($this->cardSuit($card) === $suit) {
                return true;
            }
        }

        return false;
    }

    private function hasHigherSameSuit(array $hand, string $card, string $trumpCard): bool
    {
        $suit = $this->cardSuit($card);

        foreach ($hand as $otherCard) {
            if ($this->cardSuit($otherCard) !== $suit) {
                continue;
            }

            if ($this->cardOrder($otherCard) > $this->cardOrder($card)) {
                return true;
            }
        }

        return false;
    }

    private function isMarriage(string $card, array $hand): bool
    {
        $rank = $this->cardRank($card);

        if ($rank !== 'K' && $rank !== 'Q') {
            return false;
        }

        $partner = $this->cardSuit($card) . '-' . ($rank === 'K' ? 'Q' : 'K');

        return in_array($partner, $hand, true);
    }

    private function marriagePoints(string $card, string $trumpCard): int
    {
        return $this->isTrump($card, $trumpCard) ? 40 : 20;
    }

    private function getHandPoints(array $hand): int
    {
        return array_reduce($hand, fn (int $sum, string $card): int => $sum + $this->cardValue($card), 0);
    }

    private function getPlayerTotalPoints(int $playerNumber, SnapsState $state): int
    {
        return ($state->capturedPoints[$playerNumber] ?? 0) + $this->getHandPoints($state->hands[$playerNumber] ?? []);
    }

    private function shouldEndDeal(SnapsState $state): bool
    {
        if ($this->getPlayerTotalPoints(1, $state) >= 66 || $this->getPlayerTotalPoints(2, $state) >= 66) {
            return true;
        }

        if (! empty($state->stock)) {
            return false;
        }

        return empty($state->hands[1] ?? []) && empty($state->hands[2] ?? []) && empty($state->trick);
    }

    private function completeDeal(SnapsState $state): SnapsState
    {
        $winner = $this->getDealWinner($state);

        $scores = $state->scores;
        $scores[1] = ($scores[1] ?? 0) + ($state->capturedPoints[1] ?? 0);
        $scores[2] = ($scores[2] ?? 0) + ($state->capturedPoints[2] ?? 0);

        if ($scores[1] >= 501 || $scores[2] >= 501) {
            $scores[$winner] = ($scores[$winner] ?? 0) + 1;

            return new SnapsState(
                players: $state->players,
                currentTurn: $winner,
                hands: [],
                stock: [],
                trumpCard: $state->trumpCard,
                trick: $state->trick,
                capturedPoints: $state->capturedPoints,
                scores: $scores,
                lastTrickWinner: $state->lastTrickWinner,
                drawQueue: [],
            );
        }

        return $this->dealNewHand($state->players, $winner, $scores);
    }

    private function getDealWinner(SnapsState $state): int
    {
        // If the deal was closed, the closer's total must be at least 66 otherwise they lose.
        if ($state->closed && $state->closedBy !== null) {
            $closer = $state->closedBy;
            $other = $this->getOtherPlayer($closer);

            $closerTotal = $this->getPlayerTotalPoints($closer, $state);

            if ($closerTotal < 66) {
                return $other;
            }

            // use frozen totals taken at the moment of closing for final comparison
            $total1 = $state->totalPointsAtClose[1] ?? $this->getPlayerTotalPoints(1, $state);
            $total2 = $state->totalPointsAtClose[2] ?? $this->getPlayerTotalPoints(2, $state);

            if ($total1 === $total2) {
                return $state->lastTrickWinner ?? 1;
            }

            return $total1 > $total2 ? 1 : 2;
        }

        $total1 = $this->getPlayerTotalPoints(1, $state);
        $total2 = $this->getPlayerTotalPoints(2, $state);

        if ($total1 >= 66 || $total2 >= 66) {
            if ($total1 === $total2) {
                return $state->lastTrickWinner ?? 1;
            }

            return $total1 > $total2 ? 1 : 2;
        }

        $captured1 = $state->capturedPoints[1] ?? 0;
        $captured2 = $state->capturedPoints[2] ?? 0;

        if ($captured1 === $captured2) {
            return $state->lastTrickWinner ?? 1;
        }

        return $captured1 > $captured2 ? 1 : 2;
    }

    private function dealPenalty(int $loserPoints): int
    {
        if ($loserPoints === 0) {
            return 3;
        }

        if ($loserPoints < 33) {
            return 2;
        }

        return 1;
    }

    private function getOtherPlayer(int $playerNumber): int
    {
        return $playerNumber === 1 ? 2 : 1;
    }
}
