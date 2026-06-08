<?php

namespace App\Games\Uno;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\MoveData;
use App\Data\UnoMoveData;
use App\Data\UnoState;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class UnoEngine implements GameContract
{
    private const COLORS = ['red', 'green', 'blue', 'yellow'];

    private const WILD_COLOR = 'wild';

    public function initialState(Collection $players): GameState
    {
        $count = $players->count();

        if ($count < 2 || $count > 4) {
            throw new InvalidArgumentException('UNO requires 2–4 players.');
        }

        $deck = $this->buildDeck();
        shuffle($deck);

        $playerNumbers = range(1, $count);
        $numberedPlayers = collect(array_combine($playerNumbers, $players->values()->all()));

        $hands = [];
        foreach ($playerNumbers as $number) {
            $hands[$number] = array_splice($deck, 0, 7);
        }

        // Flip first non-wild card to start the discard pile
        $discardPile = [];
        while (! empty($deck)) {
            $card = array_shift($deck);
            if ($card['color'] === self::WILD_COLOR) {
                // Put wild back at random position and try again
                $pos = random_int(0, count($deck));
                array_splice($deck, $pos, 0, [$card]);

                continue;
            }
            $discardPile[] = $card;
            break;
        }

        $startingColor = $discardPile[0]['color'];

        return new UnoState(
            hands: $hands,
            drawPile: $deck,
            discardPile: $discardPile,
            currentTurn: 1,
            direction: 1,
            currentColor: $startingColor,
            players: $numberedPlayers,
        );
    }

    public function makeState(array $data): GameState
    {
        return new UnoState(
            hands: $data['hands'],
            drawPile: $data['drawPile'],
            discardPile: $data['discardPile'],
            currentTurn: $data['currentTurn'],
            direction: $data['direction'],
            currentColor: $data['currentColor'],
            players: collect($data['players']),
            forfeited: $data['forfeited'] ?? [],
            drewThisTurn: $data['drewThisTurn'] ?? false,
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new UnoMoveData(
            cardIndex: $data['cardIndex'] ?? null,
            action: $data['action'] ?? null,
            wildColor: $data['wildColor'] ?? null,
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        if (! $moveData instanceof UnoMoveData) {
            throw new InvalidArgumentException('UnoEngine expects UnoMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        $hand = $state->hands[$playerNumber] ?? [];

        // Draw action
        if ($moveData->action === 'draw') {
            // Cannot draw if already drew this turn (must play or pass)
            return ! $state->drewThisTurn;
        }

        // Pass action (after drawing an unplayable card)
        if ($moveData->action === 'pass') {
            return $state->drewThisTurn;
        }

        // Play a card
        if ($moveData->cardIndex !== null) {
            if ($moveData->cardIndex < 0 || $moveData->cardIndex >= count($hand)) {
                return false;
            }

            $card = $hand[$moveData->cardIndex];
            $topCard = $state->discardPile[array_key_last($state->discardPile)];

            if (! $this->isPlayable($card, $topCard, $state->currentColor)) {
                return false;
            }

            // Wild and Wild Draw Four require a chosen color
            if ($card['type'] === 'wild' || $card['type'] === 'wild_draw_four') {
                if (empty($moveData->wildColor) || ! in_array($moveData->wildColor, self::COLORS, true)) {
                    return false;
                }
            }

            // Wild Draw Four only playable if no card matches current color
            if ($card['type'] === 'wild_draw_four') {
                foreach ($hand as $idx => $handCard) {
                    if ($idx === $moveData->cardIndex) {
                        continue;
                    }
                    if ($handCard['color'] === $state->currentColor) {
                        return false;
                    }
                }
            }

            return true;
        }

        return false;
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        if (! $moveData instanceof UnoMoveData) {
            throw new InvalidArgumentException('UnoEngine expects UnoMoveData.');
        }

        // Draw action
        if ($moveData->action === 'draw') {
            $state = $this->drawCards($state, $playerNumber, 1);

            $hand = $state->hands[$playerNumber];
            $drawnCard = $hand[array_key_last($hand)];
            $topCard = $state->discardPile[array_key_last($state->discardPile)];

            $playable = $this->isPlayable($drawnCard, $topCard, $state->currentColor);

            return new UnoState(
                hands: $state->hands,
                drawPile: $state->drawPile,
                discardPile: $state->discardPile,
                currentTurn: $state->currentTurn,
                direction: $state->direction,
                currentColor: $state->currentColor,
                players: $state->players,
                forfeited: $state->forfeited,
                drewThisTurn: $playable, // stay on turn only if drawn card is playable
            );
        }

        // Pass action (drew an unplayable card, ending turn)
        if ($moveData->action === 'pass') {
            $active = $this->activeNumbers($state);

            return new UnoState(
                hands: $state->hands,
                drawPile: $state->drawPile,
                discardPile: $state->discardPile,
                currentTurn: $this->nextPlayer($playerNumber, $state->direction, $active),
                direction: $state->direction,
                currentColor: $state->currentColor,
                players: $state->players,
                forfeited: $state->forfeited,
                drewThisTurn: false,
            );
        }

        // Play a card
        $hands = $state->hands;
        $hand = $hands[$playerNumber];
        $card = $hand[$moveData->cardIndex];
        array_splice($hand, $moveData->cardIndex, 1);
        $hands[$playerNumber] = array_values($hand);

        $discardPile = $state->discardPile;
        $discardPile[] = $card;

        $currentColor = ($card['type'] === 'wild' || $card['type'] === 'wild_draw_four')
            ? $moveData->wildColor
            : $card['color'];

        $direction = $state->direction;
        $active = $this->activeNumbers($state);
        $playerCount = count($active);

        $nextTurn = match ($card['type']) {
            'skip' => $this->nextPlayer(
                $this->nextPlayer($playerNumber, $direction, $active),
                $direction,
                $active
            ),
            'reverse' => $playerCount === 2
                // In 2-player, Reverse acts as Skip
                ? $playerNumber
                : $this->nextPlayer($playerNumber, -$direction, array_reverse($active, true)),
            'draw_two' => $this->applyDrawAndSkip($state, $hands, $direction, $active, $playerNumber, 2),
            'wild_draw_four' => $this->applyDrawAndSkip($state, $hands, $direction, $active, $playerNumber, 4),
            default => $this->nextPlayer($playerNumber, $direction, $active),
        };

        // Flip direction for Reverse (not 2-player)
        if ($card['type'] === 'reverse' && $playerCount !== 2) {
            $direction = -$direction;
            $nextTurn = $this->nextPlayer($playerNumber, $direction, $active);
        }

        // Apply draw effects on the hands (draw_two / wild_draw_four)
        if ($card['type'] === 'draw_two' || $card['type'] === 'wild_draw_four') {
            $drawCount = $card['type'] === 'draw_two' ? 2 : 4;
            $victim = $this->nextPlayer($playerNumber, $direction, $active);
            $tempState = new UnoState(
                hands: $hands,
                drawPile: $state->drawPile,
                discardPile: $discardPile,
                currentTurn: $nextTurn,
                direction: $direction,
                currentColor: $currentColor,
                players: $state->players,
                forfeited: $state->forfeited,
            );
            $tempState = $this->drawCards($tempState, $victim, $drawCount);
            $hands = $tempState->hands;
            $drawPile = $tempState->drawPile;
            $discardPile = $tempState->discardPile;
        } else {
            $drawPile = $state->drawPile;
        }

        return new UnoState(
            hands: $hands,
            drawPile: $drawPile,
            discardPile: $discardPile,
            currentTurn: $nextTurn,
            direction: $direction,
            currentColor: $currentColor,
            players: $state->players,
            forfeited: $state->forfeited,
            drewThisTurn: false,
        );
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        foreach ($state->hands as $playerNumber => $hand) {
            if (count($hand) === 0) {
                return new GameResult(
                    winner: $state->players->get($playerNumber),
                    draw: false,
                );
            }
        }

        return null;
    }

    public function getCurrentTurn(GameState $state): int
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        return $state->currentTurn;
    }

    public function forfeitPlayer(GameState $state, int $playerNumber): GameState
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        $forfeited = array_values(array_unique([...$state->forfeited, $playerNumber]));
        $currentTurn = $state->currentTurn;

        if ($currentTurn === $playerNumber) {
            $active = array_values(array_filter(
                array_keys($state->hands),
                fn ($n) => ! in_array($n, $forfeited, true)
            ));
            $currentTurn = $active[0] ?? $playerNumber;
        }

        return new UnoState(
            hands: $state->hands,
            drawPile: $state->drawPile,
            discardPile: $state->discardPile,
            currentTurn: $currentTurn,
            direction: $state->direction,
            currentColor: $state->currentColor,
            players: $state->players,
            forfeited: $forfeited,
        );
    }

    public function activePlayerNumbers(GameState $state): array
    {
        if (! $state instanceof UnoState) {
            throw new InvalidArgumentException('UnoEngine expects UnoState.');
        }

        return $state->players->keys()
            ->map(fn ($n) => (int) $n)
            ->reject(fn (int $n) => in_array($n, $state->forfeited, true))
            ->values()
            ->all();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function buildDeck(): array
    {
        $deck = [];

        foreach (self::COLORS as $color) {
            // One 0 per color
            $deck[] = ['color' => $color, 'type' => 'number', 'value' => 0];

            // Two of each 1-9 and action cards
            for ($i = 0; $i < 2; $i++) {
                for ($v = 1; $v <= 9; $v++) {
                    $deck[] = ['color' => $color, 'type' => 'number', 'value' => $v];
                }
                $deck[] = ['color' => $color, 'type' => 'skip', 'value' => null];
                $deck[] = ['color' => $color, 'type' => 'reverse', 'value' => null];
                $deck[] = ['color' => $color, 'type' => 'draw_two', 'value' => null];
            }
        }

        // 4 Wild and 4 Wild Draw Four
        for ($i = 0; $i < 4; $i++) {
            $deck[] = ['color' => self::WILD_COLOR, 'type' => 'wild', 'value' => null];
            $deck[] = ['color' => self::WILD_COLOR, 'type' => 'wild_draw_four', 'value' => null];
        }

        return $deck;
    }

    private function isPlayable(array $card, array $topCard, string $currentColor): bool
    {
        if ($card['color'] === self::WILD_COLOR) {
            return true;
        }

        if ($card['color'] === $currentColor) {
            return true;
        }

        if ($card['type'] === 'number' && $topCard['type'] === 'number' && $card['value'] === $topCard['value']) {
            return true;
        }

        if ($card['type'] !== 'number' && $card['type'] === $topCard['type']) {
            return true;
        }

        return false;
    }

    /** Returns the next active player in the given direction. */
    private function nextPlayer(int $current, int $direction, array $active): int
    {
        $idx = array_search($current, $active, true);

        if ($idx === false) {
            return $active[0];
        }

        $count = count($active);
        $next = (($idx + $direction) % $count + $count) % $count;

        return $active[$next];
    }

    private function activeNumbers(UnoState $state): array
    {
        return array_values(array_filter(
            array_keys($state->hands),
            fn ($n) => ! in_array($n, $state->forfeited, true)
        ));
    }

    private function drawCards(UnoState $state, int $playerNumber, int $count): UnoState
    {
        $hands = $state->hands;
        $drawPile = $state->drawPile;
        $discardPile = $state->discardPile;

        for ($i = 0; $i < $count; $i++) {
            if (empty($drawPile)) {
                // Reshuffle discard pile (minus top card) into draw pile
                if (count($discardPile) <= 1) {
                    break; // nothing to reshuffle
                }
                $top = array_pop($discardPile);
                $drawPile = $discardPile;
                shuffle($drawPile);
                $discardPile = [$top];
            }

            $hands[$playerNumber][] = array_shift($drawPile);
        }

        return new UnoState(
            hands: $hands,
            drawPile: $drawPile,
            discardPile: $discardPile,
            currentTurn: $state->currentTurn,
            direction: $state->direction,
            currentColor: $state->currentColor,
            players: $state->players,
            forfeited: $state->forfeited,
            drewThisTurn: $state->drewThisTurn,
        );
    }

    /**
     * Applies draw-and-skip effect and returns the nextTurn player number.
     * Mutates $hands via drawCards (returns via reference is not used; we
     * handle draws later in applyMove after nextTurn is determined).
     */
    private function applyDrawAndSkip(UnoState $state, array $hands, int $direction, array $active, int $playerNumber, int $drawCount): int
    {
        $victim = $this->nextPlayer($playerNumber, $direction, $active);

        return $this->nextPlayer($victim, $direction, $active);
    }
}
