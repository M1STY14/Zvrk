<?php

namespace App\Games\Bela;

use App\Contracts\GameContract;
use App\Data\BelaMoveData;
use App\Data\BelaState;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class BelaEngine implements GameContract
{
    private const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];

    private const RANKS = ['7', '8', '9', 'jack', 'queen', 'king', '10', 'ace'];

    private const TEAM_ONE = [1, 3];

    private const TEAM_TWO = [2, 4];

    private const TRUMP_POINTS = [
        '7' => 0,
        '8' => 0,
        '9' => 14,
        'jack' => 20,
        'queen' => 3,
        'king' => 4,
        '10' => 10,
        'ace' => 11,
    ];

    private const NON_TRUMP_POINTS = [
        '7' => 0,
        '8' => 0,
        '9' => 0,
        'jack' => 2,
        'queen' => 3,
        'king' => 4,
        '10' => 10,
        'ace' => 11,
    ];

    private const LAST_TRICK_BONUS = 10;

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
            type: $data['type'] ?? 'play',
            card: $data['card'] ?? null,
            accept: $data['accept'] ?? null,
            suit: $data['suit'] ?? null,
            pass: $data['pass'] ?? null,
            declare: $data['declare'] ?? null,
        );
    }

    public function initialState(Collection $players): GameState
    {
        if ($players->count() !== 4) {
            throw new InvalidArgumentException('Bela requires exactly four players.');
        }

        $playersByNumber = collect([
            1 => $players->get(0),
            2 => $players->get(1),
            3 => $players->get(2),
            4 => $players->get(3),
        ]);

        $deck = $this->shuffleDeck($this->buildDeck());

        $hands = [
            1 => [],
            2 => [],
            3 => [],
            4 => [],
        ];

        for ($index = 0; $index < 32; $index++) {
            $playerNumber = ($index % 4) + 1;
            $hands[$playerNumber][] = $deck[$index];
        }

        $declarations = $this->detectDeclarations($hands);

        return new BelaState(
            hands: $hands,
            trick: [],
            trickHistory: [],
            trumpSuit: null,
            trumpCaller: null,
            teamScores: [0, 0],
            roundPoints: [0, 0],
            phase: 'bid',
            round: 1,
            declarations: $declarations,
            currentTurn: 1,
            dealer: 4,
            turnedUpCard: null,
            players: $playersByNumber,
            declarationChoices: [1 => null, 2 => null, 3 => null, 4 => null],
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

        if ($state->phase === 'bid') {
            if ($moveData->type !== 'bid') {
                return false;
            }

            if (is_string($moveData->suit)) {
                return in_array($moveData->suit, self::SUITS, true);
            }

            if ($moveData->pass === true) {
                $passCount = count(array_filter($state->bids, fn ($bid) => $bid === 'pass'));
                $mustChoose = $passCount >= 3 && $playerNumber === 4;

                return ! $mustChoose;
            }

            return false;
        }

        if ($state->phase !== 'play') {
            return false;
        }

        if ($moveData->type !== 'play' || ! is_string($moveData->card)) {
            return false;
        }

        $hand = $state->hands[$playerNumber] ?? [];

        if (! in_array($moveData->card, $hand, true)) {
            return false;
        }

        if (count($state->trick) === 0) {
            return true;
        }

        $leadSuit = $this->cardSuit($state->trick[0]['card']);
        $cardSuit = $this->cardSuit($moveData->card);

        if ($cardSuit !== $leadSuit && $this->hasSuit($hand, $leadSuit)) {
            return false;
        }

        if ($cardSuit !== $leadSuit
            && $state->trumpSuit !== null
            && $this->hasSuit($hand, $state->trumpSuit)
            && $cardSuit !== $state->trumpSuit
        ) {
            return false;
        }

        return true;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        if (! $moveData instanceof BelaMoveData) {
            throw new InvalidArgumentException('BelaEngine expects BelaMoveData.');
        }

        if ($state->phase === 'bid') {
            if ($moveData->type !== 'bid') {
                throw new InvalidArgumentException('Invalid Bela bid move.');
            }

            $bids = $state->bids;

            if (is_string($moveData->suit)) {
                $bids[$playerNumber] = $moveData->suit;
                return $this->startPlay($state, $playerNumber, $moveData->suit);
            }

            if ($moveData->pass !== true) {
                throw new InvalidArgumentException('Invalid Bela bid move.');
            }

            $bids[$playerNumber] = 'pass';
            $nextTurn = $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state));

            return new BelaState(
                hands: $state->hands,
                trick: $state->trick,
                trickHistory: $state->trickHistory,
                trumpSuit: $state->trumpSuit,
                trumpCaller: $state->trumpCaller,
                teamScores: $state->teamScores,
                roundPoints: $state->roundPoints,
                phase: 'bid',
                round: $state->round,
                declarations: $state->declarations,
                currentTurn: $nextTurn,
                dealer: $state->dealer,
                turnedUpCard: $state->turnedUpCard,
                players: $state->players,
                declarationChoices: $state->declarationChoices,
                bids: $bids,
                forfeited: $state->forfeited,
            );
        }

        if ($state->phase !== 'play') {
            throw new InvalidArgumentException('BelaEngine cannot apply move in current phase.');
        }

        if ($moveData->type === 'declare') {
            if (! is_bool($moveData->declare) || ! array_key_exists($playerNumber, $state->declarationChoices)) {
                throw new InvalidArgumentException('Invalid Bela declare move.');
            }

            $declarationChoices = $state->declarationChoices;
            $declarationChoices[$playerNumber] = $moveData->declare;

            return new BelaState(
                hands: $state->hands,
                trick: $state->trick,
                trickHistory: $state->trickHistory,
                trumpSuit: $state->trumpSuit,
                trumpCaller: $state->trumpCaller,
                teamScores: $state->teamScores,
                roundPoints: $state->roundPoints,
                phase: $state->phase,
                round: $state->round,
                declarations: $state->declarations,
                currentTurn: $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state)),
                dealer: $state->dealer,
                turnedUpCard: $state->turnedUpCard,
                players: $state->players,
                declarationChoices: $declarationChoices,
                bids: $state->bids,
                forfeited: $state->forfeited,
            );
        }

        if ($moveData->type !== 'play' || ! is_string($moveData->card)) {
            throw new InvalidArgumentException('Invalid Bela play move.');
        }

        $hand = $state->hands[$playerNumber] ?? [];
        $card = $moveData->card;

        $newHand = array_values(array_filter(
            $hand,
            fn (string $handCard): bool => $handCard !== $card,
        ));

        $hands = $state->hands;
        $hands[$playerNumber] = $newHand;

        $trick = [...$state->trick, ['player' => $playerNumber, 'card' => $card]];
        $activePlayers = $this->activePlayerNumbers($state);

        if (count($trick) < count($activePlayers)) {
            return new BelaState(
                hands: $hands,
                trick: $trick,
                trickHistory: $state->trickHistory,
                trumpSuit: $state->trumpSuit,
                trumpCaller: $state->trumpCaller,
                teamScores: $state->teamScores,
                roundPoints: $state->roundPoints,
                phase: 'play',
                round: $state->round,
                declarations: $state->declarations,
                currentTurn: $this->nextActivePlayer($playerNumber, $activePlayers),
                dealer: $state->dealer,
                turnedUpCard: $state->turnedUpCard,
                players: $state->players,
                bids: [],
                forfeited: $state->forfeited,
            );
        }

        $trickWinner = $this->determineTrickWinner($trick, $state->trumpSuit);
        $trickPoints = $this->calculateTrickPoints($trick, $state->trumpSuit);
        $teamIndex = $this->teamIndex($trickWinner);

        $roundPoints = $state->roundPoints;
        $roundPoints[$teamIndex] += $trickPoints;

        $trickHistory = [...$state->trickHistory, [
            'plays' => $trick,
            'winner' => $trickWinner,
            'points' => $trickPoints,
        ]];

        $nextState = new BelaState(
            hands: $hands,
            trick: [],
            trickHistory: $trickHistory,
            trumpSuit: $state->trumpSuit,
            trumpCaller: $state->trumpCaller,
            teamScores: $state->teamScores,
            roundPoints: $roundPoints,
            phase: 'play',
            round: $state->round,
            declarations: $state->declarations,
            currentTurn: $trickWinner,
            dealer: $state->dealer,
            turnedUpCard: $state->turnedUpCard,
            players: $state->players,
            bids: [],
            forfeited: $state->forfeited,
        );

        if ($this->isRoundComplete($nextState)) {
            return $this->completeRound($nextState, $trickWinner);
        }

        return $nextState;
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof BelaState) {
            throw new InvalidArgumentException('BelaEngine expects BelaState.');
        }

        if (max($state->teamScores) < 1001) {
            return null;
        }

        $winningTeam = $state->teamScores[0] >= 1001 ? 1 : 2;
        $playerNumber = $winningTeam === 1 ? 1 : 2;

        return new GameResult(
            winner: $state->players->get($playerNumber),
            draw: false,
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
            fn (array $entry): bool => $entry['player'] !== $playerNumber,
        ));

        $nextTurn = $state->currentTurn;
        if (! in_array($nextTurn, $this->activePlayerNumbers($state), true)) {
            $nextTurn = $this->nextActivePlayer($playerNumber, $this->activePlayerNumbers($state));
        }

        return new BelaState(
            hands: $hands,
            trick: $trick,
            trickHistory: $state->trickHistory,
            trumpSuit: $state->trumpSuit,
            trumpCaller: $state->trumpCaller,
            teamScores: $state->teamScores,
            roundPoints: $state->roundPoints,
            phase: $state->phase,
            round: $state->round,
            declarations: $state->declarations,
            currentTurn: $nextTurn,
            dealer: $state->dealer,
            turnedUpCard: $state->turnedUpCard,
            players: $state->players,
            bids: $state->bids,
            forfeited: $forfeited,
        );
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

    private function buildDeck(): array
    {
        $deck = [];

        foreach (self::SUITS as $suit) {
            foreach (self::RANKS as $rank) {
                $deck[] = "{$rank}_of_{$suit}";
            }
        }

        return $deck;
    }

    private function shuffleDeck(array $deck): array
    {
        shuffle($deck);
        return $deck;
    }

    private function cardSuit(string $card): string
    {
        return explode('_of_', $card)[1] ?? '';
    }

    private function cardRank(string $card): string
    {
        return explode('_of_', $card)[0] ?? '';
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

    private function hasHigherTrump(array $hand, string $card, ?string $trump): bool
    {
        if ($trump === null) {
            return false;
        }

        $rank = $this->cardRank($card);
        $value = $this->trumpRankValue($rank);

        foreach ($hand as $handCard) {
            if ($this->cardSuit($handCard) !== $trump) {
                continue;
            }

            if ($this->trumpRankValue($this->cardRank($handCard)) > $value) {
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
        return new BelaState(
            hands: $state->hands,
            trick: [],
            trickHistory: $state->trickHistory,
            trumpSuit: $trumpSuit,
            trumpCaller: $caller,
            teamScores: $state->teamScores,
            roundPoints: $state->roundPoints,
            phase: 'play',
            round: $state->round,
            declarations: $state->declarations,
            currentTurn: $caller,
            dealer: $state->dealer,
            turnedUpCard: null,
            players: $state->players,
            declarationChoices: $state->declarationChoices,
            bids: $state->bids,
            forfeited: $state->forfeited,
        );
    }

    private function determineTrickWinner(array $trick, ?string $trumpSuit): int
    {
        $leadSuit = $this->cardSuit($trick[0]['card']);
        $best = $trick[0];

        foreach ($trick as $play) {
            if ($this->isBetterCard($play['card'], $best['card'], $leadSuit, $trumpSuit)) {
                $best = $play;
            }
        }

        return $best['player'];
    }

    private function isBetterCard(string $candidate, string $current, string $leadSuit, ?string $trumpSuit): bool
    {
        $candidateSuit = $this->cardSuit($candidate);
        $currentSuit = $this->cardSuit($current);

        if ($candidateSuit === $currentSuit) {
            if ($candidateSuit === $trumpSuit) {
                return $this->trumpRankValue($this->cardRank($candidate)) > $this->trumpRankValue($this->cardRank($current));
            }

            return $this->nonTrumpRankValue($this->cardRank($candidate)) > $this->nonTrumpRankValue($this->cardRank($current));
        }

        if ($candidateSuit === $trumpSuit) {
            return true;
        }

        if ($currentSuit === $trumpSuit) {
            return false;
        }

        return $candidateSuit === $leadSuit;
    }

    private function trumpRankValue(string $rank): int
    {
        return match ($rank) {
            '7' => 0,
            '8' => 1,
            'queen' => 2,
            'king' => 3,
            '10' => 4,
            'ace' => 5,
            '9' => 6,
            'jack' => 7,
            default => 0,
        };
    }

    private function nonTrumpRankValue(string $rank): int
    {
        return match ($rank) {
            '7' => 0,
            '8' => 1,
            '9' => 2,
            'jack' => 3,
            'queen' => 4,
            'king' => 5,
            '10' => 6,
            'ace' => 7,
            default => 0,
        };
    }

    private function calculateTrickPoints(array $trick, ?string $trumpSuit): int
    {
        $points = 0;

        foreach ($trick as $play) {
            $rank = $this->cardRank($play['card']);
            $suit = $this->cardSuit($play['card']);

            if ($suit === $trumpSuit) {
                $points += self::TRUMP_POINTS[$rank] ?? 0;
                continue;
            }

            $points += self::NON_TRUMP_POINTS[$rank] ?? 0;
        }

        return $points;
    }

    private function teamIndex(int $playerNumber): int
    {
        return in_array($playerNumber, self::TEAM_ONE, true) ? 0 : 1;
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
        $roundPoints[$lastTeam] += self::LAST_TRICK_BONUS;

        if ($state->declarations['team1'] > $state->declarations['team2']) {
            $roundPoints[0] += $state->declarations['team1'];
        } elseif ($state->declarations['team2'] > $state->declarations['team1']) {
            $roundPoints[1] += $state->declarations['team2'];
        }

        $callerTeam = $this->teamIndex($state->trumpCaller ?? $state->dealer);
        $opponentTeam = $callerTeam === 0 ? 1 : 0;

        if ($roundPoints[$callerTeam] < 82) {
            $roundPoints[$opponentTeam] = array_sum($roundPoints);
            $roundPoints[$callerTeam] = 0;
        }

        $teamScores = [
            $state->teamScores[0] + $roundPoints[0],
            $state->teamScores[1] + $roundPoints[1],
        ];

        if (max($teamScores) >= 1001) {
            return new BelaState(
                hands: $state->hands,
                trick: [],
                trickHistory: $state->trickHistory,
                trumpSuit: $state->trumpSuit,
                trumpCaller: $state->trumpCaller,
                teamScores: $teamScores,
                roundPoints: $roundPoints,
                phase: 'score',
                round: $state->round,
                declarations: $state->declarations,
                currentTurn: $state->currentTurn,
                dealer: $state->dealer,
                turnedUpCard: $state->turnedUpCard,
                players: $state->players,
                bids: [],
                forfeited: $state->forfeited,
            );
        }

        return $this->startNextRound($state->players, $teamScores, $state->dealer, $state->round + 1);
    }

    private function startNextRound(Collection $players, array $teamScores, int $previousDealer, int $nextRound): BelaState
    {
        $deck = $this->shuffleDeck($this->buildDeck());

        $hands = [
            1 => [],
            2 => [],
            3 => [],
            4 => [],
        ];

        for ($index = 0; $index < 32; $index++) {
            $playerNumber = ($index % 4) + 1;
            $hands[$playerNumber][] = $deck[$index];
        }

        $declarations = $this->detectDeclarations($hands);
        $dealer = $this->nextActivePlayer($previousDealer, [1, 2, 3, 4]);
        $currentTurn = $this->nextActivePlayer($dealer, [1, 2, 3, 4]);

        return new BelaState(
            hands: $hands,
            trick: [],
            trickHistory: [],
            trumpSuit: null,
            trumpCaller: null,
            teamScores: $teamScores,
            roundPoints: [0, 0],
            phase: 'bid',
            round: $nextRound,
            declarations: $declarations,
            currentTurn: $currentTurn,
            dealer: $dealer,
            turnedUpCard: null,
            players: $players,
            declarationChoices: [1 => null, 2 => null, 3 => null, 4 => null],
            bids: [],
            forfeited: [],
        );
    }

    private function detectDeclarations(array $hands): array
    {
        $declarations = [
            'team1' => 0,
            'team2' => 0,
            'details' => [],
        ];

        foreach ($hands as $playerNumber => $hand) {
            $playerPoints = 0;
            $handBySuit = [];

            foreach ($hand as $card) {
                $suit = $this->cardSuit($card);
                $handBySuit[$suit][] = $this->cardRank($card);
            }

            foreach ($handBySuit as $suit => $ranks) {
                $values = array_map(fn (string $rank): int => array_search($rank, self::RANKS, true), $ranks);
                sort($values);

                $consecutive = 1;
                for ($i = 1; $i < count($values); $i++) {
                    if ($values[$i] === $values[$i - 1] + 1) {
                        $consecutive++;
                    } else {
                        $playerPoints += $this->declarationSequencePoints($consecutive);
                        $consecutive = 1;
                    }
                }

                $playerPoints += $this->declarationSequencePoints($consecutive);
            }

            // Check for 4 of a kind (all 8 ranks)
            foreach (self::RANKS as $rank) {
                $count = 0;

                foreach ($hand as $card) {
                    if ($this->cardRank($card) === $rank) {
                        $count++;
                    }
                }

                if ($count === 4) {
                    $playerPoints += $this->declarationFourOfAKindPoints($rank);
                }
            }

            if ($playerPoints > 0) {
                $teamKey = $this->teamIndex((int) $playerNumber) === 0 ? 'team1' : 'team2';
                $declarations[$teamKey] += $playerPoints;
            }
        }

        return $declarations;
    }

    private function declarationSequencePoints(int $length): int
    {
        return match ($length) {
            3 => 20,
            4 => 50,
            5, 6, 7, 8 => 100,
            default => 0,
        };
    }

    private function declarationFourOfAKindPoints(string $rank): int
    {
        return match ($rank) {
            'jack' => 200,
            '9' => 150,
            default => 100,
        };
    }
}
