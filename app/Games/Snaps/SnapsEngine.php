<?php

namespace App\Games\Snaps;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Data\SnapsCard;
use App\Data\SnapsMoveData;
use App\Data\SnapsState;
use App\Enums\SnapsRank;
use App\Enums\SnapsSuit;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class SnapsEngine implements GameContract
{
    // Game end conditions
    private const WINNING_SCORE = 501;
    private const DEAL_END_POINTS_THRESHOLD = 66;

    // Card distribution
    private const INITIAL_HAND_SIZE = 3;
    private const ADDITIONAL_HAND_SIZE = 2;

    // Player identifiers
    private const PLAYER_ONE = 1;
    private const PLAYER_TWO = 2;

    // Queue operations
    private const QUEUE_REMOVE_COUNT = 1;

    // Game constants
    private const EXPECTED_PLAYER_COUNT = 2;
    private const TRICK_FULL_CARD_COUNT = 2;
    private const TRICK_FIRST_CARD_COUNT = 1;
    private const MIN_STOCK_INDEX = 0;

    public function makeState(array $data): GameState
    {
        return new SnapsState(
            players: collect($data['players'] ?? [])->mapWithKeys(
                fn ($userId, $playerNumber) => [(int) $playerNumber => $userId],
            ),
            currentTurn: (int) $data['currentTurn'],
            hands: $this->deserializeHands($data['hands'] ?? []),
            stock: collect($data['stock'] ?? [])->map(fn ($card) => SnapsCard::fromString($card)),
            trumpCard: SnapsCard::fromString($data['trumpCard'] ?? 'H-A'),
            trick: collect($data['trick'] ?? [])->map(fn ($item) => [
                'player' => $item['player'],
                'card' => SnapsCard::fromString($item['card']),
                'marriagePoints' => $item['marriagePoints'],
            ]),
            lastTrick: collect($data['lastTrick'] ?? [])->map(fn ($item) => [
                'player' => $item['player'],
                'card' => SnapsCard::fromString($item['card']),
            ]),
            capturedPoints: collect($data['capturedPoints'] ?? [self::PLAYER_ONE => 0, self::PLAYER_TWO => 0]),
            scores: collect($data['scores'] ?? [self::PLAYER_ONE => 0, self::PLAYER_TWO => 0]),
            lastTrickWinner: $data['lastTrickWinner'] ?? null,
            drawQueue: collect($data['drawQueue'] ?? []),
            closed: $data['closed'] ?? false,
            closedBy: $data['closedBy'] ?? null,
            totalPointsAtClose: collect($data['totalPointsAtClose'] ?? [self::PLAYER_ONE => 0, self::PLAYER_TWO => 0]),
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new SnapsMoveData(
            card: isset($data['card']) ? SnapsCard::fromString($data['card']) : null,
            draw: $data['draw'] ?? false,
            declareMarriage: $data['declare_marriage'] ?? false,
            close: $data['close'] ?? false,
            swapTrump: $data['swap_trump'] ?? false,
        );
    }

    public function initialState(Collection $players): GameState
    {
        if ($players->count() !== self::EXPECTED_PLAYER_COUNT) {
            throw new InvalidArgumentException('Snaps requires exactly two players.');
        }

        return $this->dealNewHand(
            collect([self::PLAYER_ONE => $players->get(0), self::PLAYER_TWO => $players->get(1)]),
            self::PLAYER_ONE,
            collect([self::PLAYER_ONE => 0, self::PLAYER_TWO => 0]),
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (!$state instanceof SnapsState || !$moveData instanceof SnapsMoveData) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState and SnapsMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        // Handle draw action
        if ($moveData->draw) {
            return $this->validateDrawMove($state, $playerNumber);
        }

        // If there is a pending draw queue, non-draw actions are not allowed
        if ($state->drawQueue->isNotEmpty()) {
            return false;
        }

        // Handle swap trump action
        if ($moveData->swapTrump) {
            return $this->validateSwapTrumpMove($state, $playerNumber);
        }

        // Handle close action
        if ($moveData->close) {
            return $state->stock->isNotEmpty() && !$state->closed;
        }

        // Handle card play
        return $this->validateCardPlay($state, $playerNumber, $moveData);
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (!$state instanceof SnapsState || !$moveData instanceof SnapsMoveData) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState and SnapsMoveData.');
        }

        if ($moveData->draw) {
            return $this->applyDrawMove($state, $playerNumber);
        }

        if ($moveData->swapTrump) {
            return $this->applySwapTrumpMove($state, $playerNumber);
        }

        if ($moveData->close) {
            return $this->applyCloseMove($state, $playerNumber);
        }

        return $this->applyCardPlay($state, $playerNumber, $moveData);
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (!$state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        $winner = $state->scores
            ->filter(fn ($score) => $score >= self::WINNING_SCORE)
            ->keys()
            ->sortByDesc(fn ($playerNumber) => $state->scores[$playerNumber])
            ->first();

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
        if (!$state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        return $state->currentTurn;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        if (!$state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        $currentTurn = $state->currentTurn === $playerNumber
            ? ($playerNumber === self::PLAYER_ONE ? self::PLAYER_TWO : self::PLAYER_ONE)
            : $state->currentTurn;

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
            drawQueue: $state->drawQueue,
            closed: $state->closed,
            closedBy: $state->closedBy,
            totalPointsAtClose: $state->totalPointsAtClose,
            lastTrick: $state->lastTrick,
        );
    }

    public function activePlayerNumbers(GameState $state): array
    {
        if (!$state instanceof SnapsState) {
            throw new InvalidArgumentException('SnapsEngine expects SnapsState.');
        }

        return $state->players->keys()
            ->map(fn ($number): int => (int) $number)
            ->values()
            ->all();
    }

    // Validation helpers
    private function validateDrawMove(SnapsState $state, int $playerNumber): bool
    {
        return $state->drawQueue->isNotEmpty()
            && $state->drawQueue->first() === $playerNumber
            && $state->stock->isNotEmpty();
    }

    private function validateSwapTrumpMove(SnapsState $state, int $playerNumber): bool
    {
        $hand = $state->hands->get($playerNumber, collect());
        $trumpJack = new SnapsCard($state->trumpCard->suit, SnapsRank::Jack);

        return $hand->contains(fn ($card) => $card->suit === $trumpJack->suit && $card->rank === $trumpJack->rank)
            && $state->stock->isNotEmpty()
            && !$state->closed;
    }

    private function validateCardPlay(SnapsState $state, int $playerNumber, SnapsMoveData $moveData): bool
    {
        $hand = $state->hands->get($playerNumber, collect());
        $card = $moveData->card;

        // Check if card is in hand
        if (!$hand->contains(fn (SnapsCard $handCard) => $this->cardsEqual($handCard, $card))) {
            return false;
        }

        // Check marriage declaration
        if ($moveData->declareMarriage && !$card->isMarriage(...$hand->all())) {
            return false;
        }

        // Leading (no card to respond to) is always free.
        if ($state->trick->count() !== self::TRICK_FIRST_CARD_COUNT) {
            return true;
        }

        // First phase (talon open): no obligation to follow suit or head the trick.
        if (!$state->closed && $state->stock->isNotEmpty()) {
            return true;
        }

        return $this->isLegalFollow($hand, $state->trick->get(0)['card'], $card, $state->trumpCard);
    }

    /**
     * Endgame follow rules: follow the led suit and head the trick when able; otherwise trump
     * if able (and head an existing trump lead when able).
     */
    private function isLegalFollow(Collection $hand, SnapsCard $lead, SnapsCard $card, SnapsCard $trumpCard): bool
    {
        if ($this->handHasSuit($hand, $lead->suit)) {
            if ($card->suit !== $lead->suit) {
                return false;
            }

            return !$this->handHasHigherInSuit($hand, $lead) || $card->beats($lead, $trumpCard);
        }

        if ($this->handHasSuit($hand, $trumpCard->suit)) {
            if (!$card->isTrump($trumpCard)) {
                return false;
            }

            if ($lead->isTrump($trumpCard) && $this->handHasHigherInSuit($hand, $lead) && !$card->beats($lead, $trumpCard)) {
                return false;
            }
        }

        return true;
    }

    private function handHasSuit(Collection $hand, SnapsSuit $suit): bool
    {
        return $hand->contains(fn (SnapsCard $card) => $card->suit === $suit);
    }

    private function handHasHigherInSuit(Collection $hand, SnapsCard $card): bool
    {
        return $hand->contains(
            fn (SnapsCard $other) => $other->suit === $card->suit && $other->rank->order() > $card->rank->order(),
        );
    }

    // Apply move helpers
    private function applyDrawMove(SnapsState $state, int $playerNumber): GameState
    {
        if ($state->stock->isEmpty()) {
            throw new InvalidArgumentException('No cards left in stock.');
        }

        $drawIndex = random_int(self::MIN_STOCK_INDEX, $state->stock->count() - 1);
        $drawnCard = $state->stock[$drawIndex];

        $newStock = $state->stock->reject(fn ($c, $idx) => $idx === $drawIndex);
        $newHands = $state->hands->put($playerNumber, $state->hands->get($playerNumber, collect())->push($drawnCard));
        $newDrawQueue = $state->drawQueue->slice(self::QUEUE_REMOVE_COUNT);

        if ($newStock->isEmpty()) {
            $newDrawQueue = collect();
            $currentTurn = $state->lastTrickWinner ?? $playerNumber;
        } else {
            $currentTurn = $newDrawQueue->isNotEmpty()
                ? $newDrawQueue->first()
                : ($state->lastTrickWinner ?? $playerNumber);
        }

        return new SnapsState(
            players: $state->players,
            currentTurn: $currentTurn,
            hands: $newHands,
            stock: $newStock,
            trumpCard: $state->trumpCard,
            trick: $state->trick,
            capturedPoints: $state->capturedPoints,
            scores: $state->scores,
            lastTrickWinner: $state->lastTrickWinner,
            drawQueue: $newDrawQueue,
            closed: $state->closed,
            closedBy: $state->closedBy,
            totalPointsAtClose: $state->totalPointsAtClose,
            lastTrick: $state->lastTrick,
        );
    }

    private function applySwapTrumpMove(SnapsState $state, int $playerNumber): GameState
    {
        $hand = $state->hands->get($playerNumber, collect());
        $trumpJack = new SnapsCard($state->trumpCard->suit, SnapsRank::Jack);

        $newHand = $hand
            ->reject(fn ($card) => $card->suit === $trumpJack->suit && $card->rank === $trumpJack->rank)
            ->push($state->trumpCard);

        return new SnapsState(
            players: $state->players,
            currentTurn: $playerNumber,
            hands: $state->hands->put($playerNumber, $newHand),
            stock: $state->stock,
            trumpCard: $trumpJack,
            trick: $state->trick,
            capturedPoints: $state->capturedPoints,
            scores: $state->scores,
            lastTrickWinner: $state->lastTrickWinner,
            drawQueue: $state->drawQueue,
            closed: $state->closed,
            closedBy: $state->closedBy,
            totalPointsAtClose: $state->totalPointsAtClose,
            lastTrick: $state->lastTrick,
        );
    }

    private function applyCloseMove(SnapsState $state, int $playerNumber): GameState
    {
        if ($state->stock->isEmpty() || $state->closed) {
            throw new InvalidArgumentException('Cannot close: stock already empty or game already closed.');
        }

        $totalPointsAtClose = collect([
            self::PLAYER_ONE => $this->getPlayerTotalPoints(self::PLAYER_ONE, $state),
            self::PLAYER_TWO => $this->getPlayerTotalPoints(self::PLAYER_TWO, $state),
        ]);

        return new SnapsState(
            players: $state->players,
            currentTurn: $playerNumber,
            hands: $state->hands,
            stock: collect(),
            trumpCard: $state->trumpCard,
            trick: $state->trick,
            capturedPoints: $state->capturedPoints,
            scores: $state->scores,
            lastTrickWinner: $state->lastTrickWinner,
            drawQueue: collect(),
            closed: true,
            closedBy: $playerNumber,
            totalPointsAtClose: $totalPointsAtClose,
            lastTrick: $state->lastTrick,
        );
    }

    private function applyCardPlay(SnapsState $state, int $playerNumber, SnapsMoveData $moveData): GameState
    {
        $hand = $state->hands->get($playerNumber, collect());
        $newHand = $hand->reject(fn ($card) => $this->cardsEqual($card, $moveData->card));

        $marriagePoints = ($moveData->declareMarriage && $moveData->card->isMarriage(...$hand->all()))
            ? $moveData->card->marriagePoints($state->trumpCard)
            : 0;

        $newTrick = $state->trick->push([
            'player' => $playerNumber,
            'card' => $moveData->card,
            'marriagePoints' => $marriagePoints,
        ]);

        $newHands = $state->hands->put($playerNumber, $newHand);
        $currentTurn = $playerNumber === self::PLAYER_ONE ? self::PLAYER_TWO : self::PLAYER_ONE;
        $newCapturedPoints = $state->capturedPoints->collect();
        $newStock = $state->stock;
        $newDrawQueue = collect();
        $lastTrick = $state->lastTrick;

        if ($newTrick->count() === self::TRICK_FULL_CARD_COUNT) {
            $trickWinner = $this->resolveTrick($newTrick, $state->trumpCard);
            $points = $newTrick->sum(fn ($item) => $item['card']->value())
                + $newTrick->sum(fn ($item) => $item['marriagePoints']);

            $newCapturedPoints[$trickWinner] = ($newCapturedPoints[$trickWinner] ?? 0) + $points;

            $currentTurn = $trickWinner;
            // Keep the finished trick so clients can show it (and the winner) before it's swept.
            $lastTrick = $newTrick->map(fn ($item) => ['player' => $item['player'], 'card' => $item['card']])->values();
            $newTrick = collect();
            $lastTrickWinner = $trickWinner;

            if ($newStock->isNotEmpty()) {
                $newDrawQueue = collect([$trickWinner, $trickWinner === self::PLAYER_ONE ? self::PLAYER_TWO : self::PLAYER_ONE]);
            }
        } else {
            $lastTrickWinner = $state->lastTrickWinner;
        }

        $newState = new SnapsState(
            players: $state->players,
            currentTurn: $currentTurn,
            hands: $newHands,
            stock: $newStock,
            trumpCard: $state->trumpCard,
            trick: $newTrick,
            capturedPoints: $newCapturedPoints,
            scores: $state->scores,
            lastTrickWinner: $lastTrickWinner,
            drawQueue: $newDrawQueue,
            closed: $state->closed,
            closedBy: $state->closedBy,
            totalPointsAtClose: $state->totalPointsAtClose,
            lastTrick: $lastTrick,
        );

        if ($this->shouldEndDeal($newState)) {
            return $this->completeDeal($newState);
        }

        return $newState;
    }

    // Private helpers
    private function dealNewHand(Collection $players, int $startingTurn, Collection $scores): SnapsState
    {
        $deck = collect(SnapsCard::createDeck());
        $deck = $deck->shuffle();

        $hands = collect();

        foreach ($players as $playerNumber => $playerId) {
            $hands[$playerNumber] = $deck->splice(0, self::INITIAL_HAND_SIZE);
        }

        $trumpCard = $deck->shift();

        foreach ($players as $playerNumber => $playerId) {
            $hands[$playerNumber] = $hands[$playerNumber]->merge($deck->splice(0, self::ADDITIONAL_HAND_SIZE));
        }

        return new SnapsState(
            players: $players,
            currentTurn: $startingTurn,
            hands: $hands,
            stock: $deck,
            trumpCard: $trumpCard,
            trick: collect(),
            capturedPoints: collect([self::PLAYER_ONE => 0, self::PLAYER_TWO => 0]),
            scores: $scores,
            lastTrickWinner: null,
            drawQueue: collect(),
        );
    }

    private function resolveTrick(Collection $trick, SnapsCard $trumpCard): int
    {
        $lead = $trick->get(0);
        $follow = $trick->get(1);

        $leadCard = $lead['card'];
        $followCard = $follow['card'];

        if ($leadCard->isTrump($trumpCard) && !$followCard->isTrump($trumpCard)) {
            return $lead['player'];
        }

        if (!$leadCard->isTrump($trumpCard) && $followCard->isTrump($trumpCard)) {
            return $follow['player'];
        }

        if ($leadCard->suit === $followCard->suit) {
            return $followCard->beats($leadCard, $trumpCard)
                ? $follow['player']
                : $lead['player'];
        }

        return $lead['player'];
    }

    private function getHandPoints(Collection $hand): int
    {
        return $hand->sum(fn ($card) => $card->value());
    }

    private function getPlayerTotalPoints(int $playerNumber, SnapsState $state): int
    {
        $hand = $state->hands->get($playerNumber, collect());
        $defaultPoints = 0;

        return ($state->capturedPoints[$playerNumber] ?? $defaultPoints) + $this->getHandPoints($hand);
    }

    private function shouldEndDeal(SnapsState $state): bool
    {
        $player1Points = $this->getPlayerTotalPoints(self::PLAYER_ONE, $state);
        $player2Points = $this->getPlayerTotalPoints(self::PLAYER_TWO, $state);

        if ($player1Points >= self::DEAL_END_POINTS_THRESHOLD || $player2Points >= self::DEAL_END_POINTS_THRESHOLD) {
            return true;
        }

        if ($state->stock->isNotEmpty()) {
            return false;
        }

        $hand1Empty = $state->hands->get(self::PLAYER_ONE, collect())->isEmpty();
        $hand2Empty = $state->hands->get(self::PLAYER_TWO, collect())->isEmpty();
        $trickEmpty = $state->trick->isEmpty();

        return $hand1Empty && $hand2Empty && $trickEmpty;
    }

    private function completeDeal(SnapsState $state): SnapsState
    {
        $winner = $this->getDealWinner($state);

        $newScores = $state->scores->collect();
        $defaultPoints = 0;
        $newScores[self::PLAYER_ONE] = ($newScores[self::PLAYER_ONE] ?? $defaultPoints) + ($state->capturedPoints[self::PLAYER_ONE] ?? $defaultPoints);
        $newScores[self::PLAYER_TWO] = ($newScores[self::PLAYER_TWO] ?? $defaultPoints) + ($state->capturedPoints[self::PLAYER_TWO] ?? $defaultPoints);

        if ($newScores[self::PLAYER_ONE] >= self::WINNING_SCORE || $newScores[self::PLAYER_TWO] >= self::WINNING_SCORE) {
            $newScores[$winner] = ($newScores[$winner] ?? 0) + 1;

            return new SnapsState(
                players: $state->players,
                currentTurn: $winner,
                hands: collect(),
                stock: collect(),
                trumpCard: $state->trumpCard,
                trick: collect(),
                capturedPoints: $state->capturedPoints,
                scores: $newScores,
                lastTrickWinner: $state->lastTrickWinner,
                drawQueue: collect(),
            );
        }

        return $this->dealNewHand($state->players, $winner, $newScores);
    }

    private function getDealWinner(SnapsState $state): int
    {
        // If the deal was closed, the closer's total must be at least 66 otherwise they lose.
        if ($state->closed && $state->closedBy !== null) {
            $closer = $state->closedBy;
            $other = $closer === self::PLAYER_ONE ? self::PLAYER_TWO : self::PLAYER_ONE;

            $closerTotal = $this->getPlayerTotalPoints($closer, $state);

            if ($closerTotal < self::DEAL_END_POINTS_THRESHOLD) {
                return $other;
            }

            $total1 = $state->totalPointsAtClose->get(self::PLAYER_ONE) ?? $this->getPlayerTotalPoints(self::PLAYER_ONE, $state);
            $total2 = $state->totalPointsAtClose->get(self::PLAYER_TWO) ?? $this->getPlayerTotalPoints(self::PLAYER_TWO, $state);

            if ($total1 === $total2) {
                return $state->lastTrickWinner ?? self::PLAYER_ONE;
            }

            return $total1 > $total2 ? self::PLAYER_ONE : self::PLAYER_TWO;
        }

        $total1 = $this->getPlayerTotalPoints(self::PLAYER_ONE, $state);
        $total2 = $this->getPlayerTotalPoints(self::PLAYER_TWO, $state);
        $defaultPoints = 0;

        if ($total1 >= self::DEAL_END_POINTS_THRESHOLD || $total2 >= self::DEAL_END_POINTS_THRESHOLD) {
            if ($total1 === $total2) {
                return $state->lastTrickWinner ?? self::PLAYER_ONE;
            }

            return $total1 > $total2 ? self::PLAYER_ONE : self::PLAYER_TWO;
        }

        $captured1 = $state->capturedPoints->get(self::PLAYER_ONE) ?? $defaultPoints;
        $captured2 = $state->capturedPoints->get(self::PLAYER_TWO) ?? $defaultPoints;

        if ($captured1 === $captured2) {
            return $state->lastTrickWinner ?? self::PLAYER_ONE;
        }

        return $captured1 > $captured2 ? self::PLAYER_ONE : self::PLAYER_TWO;
    }

    private function cardsEqual(SnapsCard $card1, SnapsCard $card2): bool
    {
        return $card1->suit === $card2->suit && $card1->rank === $card2->rank;
    }

    private function deserializeHands(array $hands): Collection
    {
        return collect($hands)->mapWithKeys(function ($hand, $playerNumber) {
            return [(int) $playerNumber => collect($hand)->map(fn ($card) => SnapsCard::fromString($card))];
        });
    }
}
