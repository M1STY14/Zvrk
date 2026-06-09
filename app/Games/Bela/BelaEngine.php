<?php

namespace App\Games\Bela;

use App\Contracts\GameContract;
use App\Data\BelaMoveData;
use App\Data\BelaState;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Enums\BelaConstants;
use App\Enums\BelaMoveType;
use App\Enums\BelaPhase;
use App\Enums\BelaRank;
use App\Enums\BidValue;
use App\Enums\Card;
use App\Enums\DeclarationTeam;
use App\Enums\Suit;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class BelaEngine implements GameContract
{
    public function makeState(array $data): GameState
    {
        return new BelaState(
            hands: $data['hands'],
            trick: $data['trick'],
            trickHistory: $data['trickHistory'],
            trumpSuit: $data['trumpSuit'],
            trumpCaller: $data['trumpCaller'],
            teamScores: $data['teamScores'],
            roundPoints: $data['roundPoints'],
            phase: $data['phase'],
            round: $data['round'],
            declarations: $data['declarations'],
            currentTurn: $data['currentTurn'],
            dealer: $data['dealer'],
            turnedUpCard: $data['turnedUpCard'],
            players: collect($data['players']),
            declarationChoices: $data['declarationChoices'] ?? [],
            bids: $data['bids'] ?? [],
            forfeited: $data['forfeited'] ?? [],
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new BelaMoveData(
            type: $data['type'] ?? BelaMoveType::Play->value,
            card: $data['card'] ?? null,
            suit: $data['suit'] ?? null,
            pass: $data['pass'] ?? null,
            declare: $data['declare'] ?? null,
        );
    }

    public function initialState(Collection $players): GameState
    {
        if ($players->count() !== BelaConstants::PLAYER_COUNT) {
            throw new InvalidArgumentException('Bela requires exactly four players.');
        }

        $playersByNumber = collect(BelaConstants::PLAYER_NUMBERS)
            ->mapWithKeys(fn (int $playerNumber, int $index) => [
                $playerNumber => $players->get($index),
            ]);

        $deck = $this->shuffledDeck();
        $hands = $this->dealHands($deck);
        $declarations = $this->detectDeclarations($hands);

        return new BelaState(
            hands: $hands,
            trick: [],
            trickHistory: [],
            trumpSuit: null,
            trumpCaller: null,
            teamScores: [0, 0],
            roundPoints: [0, 0],
            phase: BelaPhase::Bid->value,
            round: 1,
            declarations: $declarations,
            currentTurn: 1,
            dealer: BelaConstants::INITIAL_DEALER,
            turnedUpCard: null,
            players: $playersByNumber,
            declarationChoices: array_fill_keys(BelaConstants::PLAYER_NUMBERS, null),
            bids: [],
            forfeited: [],
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        if (! $moveData instanceof BelaMoveData) {
            throw new InvalidArgumentException('BelaEngine expects BelaMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        if ($state->phase === BelaPhase::Bid->value) {
            return $this->validateBid($state, $moveData, $playerNumber);
        }

        if ($state->phase !== BelaPhase::Play->value) {
            return false;
        }

        return $this->validatePlay($state, $moveData);
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        if (! $moveData instanceof BelaMoveData) {
            throw new InvalidArgumentException('BelaEngine expects BelaMoveData.');
        }

        if ($state->phase === BelaPhase::Bid->value) {
            return $this->applyBid($state, $playerNumber, $moveData);
        }

        if ($state->phase !== BelaPhase::Play->value) {
            throw new InvalidArgumentException('BelaEngine cannot apply move in current phase.');
        }

        if ($moveData->type === BelaMoveType::Declare->value) {
            return $this->applyDeclaration($state, $playerNumber, $moveData);
        }

        if ($moveData->type !== BelaMoveType::Play->value || ! is_string($moveData->card)) {
            throw new InvalidArgumentException('Invalid Bela play move.');
        }

        return $this->applyPlay($state, $playerNumber, $moveData->card);
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        $teamOneScore = $state->teamScores[0] ?? 0;
        $teamTwoScore = $state->teamScores[1] ?? 0;

        if ($teamOneScore < BelaConstants::WINNING_SCORE && $teamTwoScore < BelaConstants::WINNING_SCORE) {
            return null;
        }

        if ($teamOneScore >= BelaConstants::WINNING_SCORE && $teamTwoScore >= BelaConstants::WINNING_SCORE) {
            if ($teamOneScore === $teamTwoScore) {
                return new GameResult(winner: null, draw: true);
            }

            $winningTeam = $teamOneScore > $teamTwoScore ? 1 : 2;
        } else {
            $winningTeam = $teamOneScore >= BelaConstants::WINNING_SCORE ? 1 : 2;
        }

        $winner = $state->players
            ->filter(fn ($player, $number): bool => in_array((int) $number, $this->teamNumbers($winningTeam), true))
            ->values()
            ->last();

        return new GameResult(
            winner: $winner,
            draw: false,
            winningTeam: $winningTeam,
        );
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        return $state->currentTurn;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        if (in_array($playerNumber, $state->forfeited, true)) {
            return $state;
        }

        $forfeited = [...$state->forfeited, $playerNumber];

        $hands = $state->hands;
        unset($hands[$playerNumber]);

        $trick = array_values(array_filter(
            $state->trick,
            fn (array $entry): bool => $entry[BelaConstants::TRICK_PLAYER] !== $playerNumber,
        ));

        $nextTurn = $state->currentTurn;
        if (! in_array($nextTurn, $this->activePlayerNumbers($state), true)) {
            $nextTurn = $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state));
        }

        return $state->copyWith([
            'hands' => $hands,
            'trick' => $trick,
            'currentTurn' => $nextTurn,
            'forfeited' => $forfeited,
            'declarationChoices' => $state->declarationChoices,
        ]);
    }

    public function activePlayerNumbers(GameState $state): array
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        return $state->players->keys()
            ->map(fn ($number): int => (int) $number)
            ->reject(fn (int $number): bool => in_array($number, $state->forfeited, true))
            ->values()
            ->all();
    }

    private function validateBid(BelaState $state, BelaMoveData $moveData, int $playerNumber): bool
    {
        if ($moveData->type !== BelaMoveType::Bid->value) {
            return false;
        }

        if (is_string($moveData->suit)) {
            return Suit::tryFrom($moveData->suit) !== null;
        }

        if ($moveData->pass === true) {
            $passCount = count(array_filter($state->bids, fn ($bid) => $bid === BidValue::Pass->value));
            $mustChoose = $passCount >= 3 && $playerNumber === $state->dealer;

            return ! $mustChoose;
        }

        return false;
    }

    private function validatePlay(BelaState $state, BelaMoveData $moveData): bool
    {
        if ($moveData->type !== BelaMoveType::Play->value || ! is_string($moveData->card)) {
            return false;
        }

        $hand = $state->hands[$state->currentTurn] ?? [];

        if (! in_array($moveData->card, $hand, true)) {
            return false;
        }

        if (count($state->trick) === 0) {
            return true;
        }

        $leadCard = $this->trickEntryCard($state->trick[0]);
        $card = Card::fromString($moveData->card);
        $trumpSuit = $state->trumpSuit !== null ? Suit::fromString($state->trumpSuit) : null;

        if ($card->suit !== $leadCard->suit && $this->hasSuit($hand, $leadCard->suit)) {
            return false;
        }

        if ($card->suit !== $leadCard->suit
            && $trumpSuit !== null
            && $this->hasSuit($hand, $trumpSuit)
            && $card->suit !== $trumpSuit
        ) {
            return false;
        }

        return true;
    }

    private function applyBid(BelaState $state, int $playerNumber, BelaMoveData $moveData): BelaState
    {
        if ($moveData->type !== BelaMoveType::Bid->value) {
            throw new InvalidArgumentException('Invalid Bela bid move.');
        }

        $bids = $state->bids;

        if (is_string($moveData->suit)) {
            $bids[$playerNumber] = $moveData->suit;

            return $this->startPlay($state->copyWith([
                'bids' => $bids,
                'declarationChoices' => $state->declarationChoices,
            ]), $playerNumber, $moveData->suit);
        }

        if ($moveData->pass === true) {
            $bids[$playerNumber] = BidValue::Pass->value;
            $nextTurn = $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state));

            return $state->copyWith([
                'bids' => $bids,
                'currentTurn' => $nextTurn,
                'declarationChoices' => $state->declarationChoices,
            ]);
        }

        throw new InvalidArgumentException('Invalid Bela bid move.');
    }

    private function applyDeclaration(BelaState $state, int $playerNumber, BelaMoveData $moveData): BelaState
    {
        if (! is_bool($moveData->declare) || ! array_key_exists($playerNumber, $state->declarationChoices)) {
            throw new InvalidArgumentException('Invalid Bela declare move.');
        }

        $declarationChoices = $state->declarationChoices;
        $declarationChoices[$playerNumber] = $moveData->declare;
        $nextTurn = $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state));

        return $state->copyWith([
            'declarationChoices' => $declarationChoices,
            'currentTurn' => $nextTurn,
        ]);
    }

    private function applyPlay(BelaState $state, int $playerNumber, string $card): BelaState
    {
        $hand = $state->hands[$playerNumber] ?? [];
        $newHand = array_values(array_filter(
            $hand,
            fn (string $handCard): bool => $handCard !== $card,
        ));

        $hands = $state->hands;
        $hands[$playerNumber] = $newHand;

        $trick = [...$state->trick, $this->createTrickEntry($playerNumber, Card::fromString($card))];

        $updated = $state->copyWith([
            'hands' => $hands,
            'trick' => $trick,
            'declarationChoices' => $state->declarationChoices,
        ]);

        $activePlayers = $this->activePlayerNumbers($state);

        if (count($trick) < count($activePlayers)) {
            return $updated->copyWith([
                'currentTurn' => $this->nextActivePlayer($playerNumber, $activePlayers),
                'declarationChoices' => $state->declarationChoices,
            ]);
        }

        return $this->resolveTrick($updated);
    }

    private function resolveTrick(BelaState $state): BelaState
    {
        $trickWinner = $this->determineTrickWinner($state->trick, $state->trumpSuit);
        $trickPoints = $this->calculateTrickPoints($state->trick, $state->trumpSuit);
        $teamIndex = $this->teamIndex($trickWinner);

        $roundPoints = $state->roundPoints;
        $roundPoints[$teamIndex] += $trickPoints;

        $trickHistory = [...$state->trickHistory, [
            BelaConstants::TRICK_HISTORY_PLAYS => $state->trick,
            BelaConstants::TRICK_HISTORY_WINNER => $trickWinner,
            BelaConstants::TRICK_HISTORY_POINTS => $trickPoints,
        ]];

        $state = $state->copyWith([
            'trick' => [],
            'trickHistory' => $trickHistory,
            'roundPoints' => $roundPoints,
            'currentTurn' => $trickWinner,
            'declarationChoices' => $state->declarationChoices,
        ]);

        if ($this->isRoundComplete($state)) {
            return $this->completeRound($state, $trickWinner);
        }

        return $state;
    }

    private function dealHands(array $deck): array
    {
        $hands = array_fill_keys(BelaConstants::PLAYER_NUMBERS, []);

        foreach ($deck as $index => $card) {
            $playerNumber = ($index % BelaConstants::PLAYER_COUNT) + 1;
            $hands[$playerNumber][] = $card;
        }

        return $hands;
    }

    private function shuffleDeck(array $deck): array
    {
        shuffle($deck);

        return $deck;
    }

    private function shuffledDeck(): array
    {
        return $this->shuffleDeck(array_map(fn (Card $card): string => $card->toString(), Card::deck()));
    }

    private function createTrickEntry(int $playerNumber, Card $card): array
    {
        return [
            BelaConstants::TRICK_PLAYER => $playerNumber,
            BelaConstants::TRICK_CARD => $card->toString(),
        ];
    }

    private function trickEntryCard(array $entry): Card
    {
        return Card::fromString($entry[BelaConstants::TRICK_CARD]);
    }

    private function trickEntryPlayer(array $entry): int
    {
        return (int) $entry[BelaConstants::TRICK_PLAYER];
    }

    private function hasSuit(array $hand, Suit $suit): bool
    {
        foreach ($hand as $card) {
            if (Card::fromString($card)->suit === $suit) {
                return true;
            }
        }

        return false;
    }

    private function nextActivePlayer(int $current, array $activePlayers): int
    {
        if ($activePlayers === []) {
            return $current;
        }

        sort($activePlayers, SORT_NUMERIC);

        $index = array_search($current, $activePlayers, true);

        if ($index === false) {
            return $activePlayers[0];
        }

        return $activePlayers[($index + 1) % count($activePlayers)];
    }

    private function startPlay(BelaState $state, int $caller, string $trumpSuit): BelaState
    {
        return $state->copyWith([
            'trumpSuit' => $trumpSuit,
            'trumpCaller' => $caller,
            'phase' => BelaPhase::Play->value,
            'currentTurn' => $caller,
            'declarationChoices' => $state->declarationChoices,
        ]);
    }

    private function determineTrickWinner(array $trick, ?string $trumpSuit): int
    {
        $leadCard = $this->trickEntryCard($trick[0]);
        $trump = $trumpSuit !== null ? Suit::fromString($trumpSuit) : null;
        $best = $trick[0];
        $bestCard = $this->trickEntryCard($best);

        foreach ($trick as $play) {
            $candidateCard = $this->trickEntryCard($play);
            if ($this->isBetterCard($candidateCard, $bestCard, $leadCard->suit, $trump)) {
                $best = $play;
                $bestCard = $candidateCard;
            }
        }

        return $this->trickEntryPlayer($best);
    }

    private function isBetterCard(Card $candidateCard, Card $currentCard, Suit $leadSuit, ?Suit $trumpSuit): bool
    {
        if ($candidateCard->suit === $currentCard->suit) {
            if ($candidateCard->suit === $trumpSuit) {
                return $candidateCard->rank->trumpRankValue() > $currentCard->rank->trumpRankValue();
            }

            return $candidateCard->rank->nonTrumpRankValue() > $currentCard->rank->nonTrumpRankValue();
        }

        if ($candidateCard->suit === $trumpSuit) {
            return true;
        }

        if ($currentCard->suit === $trumpSuit) {
            return false;
        }

        return $candidateCard->suit === $leadSuit;
    }

    private function calculateTrickPoints(array $trick, ?string $trumpSuit): int
    {
        $points = 0;
        $trump = $trumpSuit !== null ? Suit::fromString($trumpSuit) : null;

        foreach ($trick as $play) {
            $card = $this->trickEntryCard($play);
            $points += $card->isTrump($trump)
                ? $card->rank->trumpPointValue()
                : $card->rank->nonTrumpPointValue();
        }

        return $points;
    }

    private function teamIndex(int $playerNumber): int
    {
        return in_array($playerNumber, BelaConstants::TEAM_ONE, true) ? 0 : 1;
    }

    private function teamNumbers(int $team): array
    {
        return $team === 1 ? BelaConstants::TEAM_ONE : BelaConstants::TEAM_TWO;
    }

    private function isRoundComplete(BelaState $state): bool
    {
        foreach ($state->hands as $hand) {
            if (count($hand) > 0) {
                return false;
            }
        }

        return true;
    }

    private function completeRound(BelaState $state, int $lastTrickWinner): BelaState
    {
        $roundPoints = $state->roundPoints;
        $lastTeam = $this->teamIndex($lastTrickWinner);
        $roundPoints[$lastTeam] += BelaConstants::LAST_TRICK_BONUS;

        if ($state->declarations[DeclarationTeam::TeamOne->value] > $state->declarations[DeclarationTeam::TeamTwo->value]) {
            $roundPoints[0] += $state->declarations[DeclarationTeam::TeamOne->value];
        } elseif ($state->declarations[DeclarationTeam::TeamTwo->value] > $state->declarations[DeclarationTeam::TeamOne->value]) {
            $roundPoints[1] += $state->declarations[DeclarationTeam::TeamTwo->value];
        }

        $callerTeam = $this->teamIndex($state->trumpCaller ?? $state->dealer);
        $opponentTeam = $callerTeam === 0 ? 1 : 0;

        // "Pala bela": the calling team must score strictly more than half of all
        // points available in the round (162 trick points + declarations). If they
        // fail to (a tie counts as failing), the opposing team collects everything.
        $totalRoundPoints = array_sum($roundPoints);

        if ($roundPoints[$callerTeam] <= $totalRoundPoints - $roundPoints[$callerTeam]) {
            $roundPoints[$opponentTeam] = $totalRoundPoints;
            $roundPoints[$callerTeam] = 0;
        }

        $teamScores = [
            $state->teamScores[0] + $roundPoints[0],
            $state->teamScores[1] + $roundPoints[1],
        ];

        if (max($teamScores) >= BelaConstants::WINNING_SCORE) {
            return $state->copyWith([
                'teamScores' => $teamScores,
                'roundPoints' => $roundPoints,
                'phase' => BelaPhase::Score->value,
                'declarationChoices' => $state->declarationChoices,
            ]);
        }

        return $this->startNextRound($state->players, $teamScores, $state->dealer, $state->round + 1);
    }

    private function startNextRound(Collection $players, array $teamScores, int $previousDealer, int $nextRound): BelaState
    {
        $deck = $this->shuffledDeck();
        $hands = $this->dealHands($deck);
        $declarations = $this->detectDeclarations($hands);
        $dealer = $this->nextActivePlayer($previousDealer, BelaConstants::PLAYER_NUMBERS);
        $currentTurn = $this->nextActivePlayer($dealer, BelaConstants::PLAYER_NUMBERS);

        return new BelaState(
            hands: $hands,
            trick: [],
            trickHistory: [],
            trumpSuit: null,
            trumpCaller: null,
            teamScores: $teamScores,
            roundPoints: [0, 0],
            phase: BelaPhase::Bid->value,
            round: $nextRound,
            declarations: $declarations,
            currentTurn: $currentTurn,
            dealer: $dealer,
            turnedUpCard: null,
            players: $players,
            declarationChoices: array_fill_keys(BelaConstants::PLAYER_NUMBERS, null),
            bids: [],
            forfeited: [],
        );
    }

    private function detectDeclarations(array $hands): array
    {
        $declarations = [
            DeclarationTeam::TeamOne->value => 0,
            DeclarationTeam::TeamTwo->value => 0,
            BelaConstants::DECLARATION_DETAILS => [],
        ];

        $rankCountsTemplate = array_fill_keys(
            array_map(fn (BelaRank $rank): string => $rank->value, BelaRank::cases()),
            0,
        );

        $suitTemplate = array_fill_keys(
            array_map(fn (Suit $suit): string => $suit->value, Suit::cases()),
            array_fill(0, count(BelaRank::cases()), false),
        );

        foreach ($hands as $playerNumber => $hand) {
            $suits = $suitTemplate;
            $rankCounts = $rankCountsTemplate;
            $playerPoints = 0;

            foreach ($hand as $card) {
                $cardObject = Card::fromString($card);
                $suits[$cardObject->suit->value][$cardObject->rank->order()] = true;
                $rankCounts[$cardObject->rank->value]++;
            }

            foreach ($suits as $ranks) {
                $playerPoints += $this->declarationPointsForSuit($ranks);
            }

            foreach ($rankCounts as $rank => $count) {
                if ($count === BelaConstants::CARDS_PER_RANK) {
                    $playerPoints += $this->declarationFourOfAKindPoints(BelaRank::fromString($rank));
                }
            }

            if ($playerPoints > 0) {
                $teamKey = $this->teamIndex((int) $playerNumber) === 0 ? DeclarationTeam::TeamOne->value : DeclarationTeam::TeamTwo->value;
                $declarations[$teamKey] += $playerPoints;
            }
        }

        return $declarations;
    }

    private function declarationPointsForSuit(array $ranks): int
    {
        $points = 0;
        $consecutive = 0;

        foreach ($ranks as $hasRank) {
            if ($hasRank) {
                $consecutive++;

                continue;
            }

            $points += $this->declarationSequencePoints($consecutive);
            $consecutive = 0;
        }

        return $points + $this->declarationSequencePoints($consecutive);
    }

    private function declarationSequencePoints(int $length): int
    {
        return match ($length) {
            BelaConstants::SEQUENCE_LENGTH_3 => BelaConstants::SEQUENCE_POINTS_3,
            BelaConstants::SEQUENCE_LENGTH_4 => BelaConstants::SEQUENCE_POINTS_4,
            5, 6, 7, 8 => BelaConstants::SEQUENCE_POINTS_5_TO_8,
            default => 0,
        };
    }

    private function declarationFourOfAKindPoints(BelaRank $rank): int
    {
        return $rank->fourOfAKindDeclarationPoints();
    }
}
