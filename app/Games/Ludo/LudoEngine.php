<?php

namespace App\Games\Ludo;

use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\LudoMoveData;
use App\Data\LudoState;
use App\Data\MoveData;
use App\Enums\LudoPhase;
use Closure;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class LudoEngine implements GameContract
{
    private const RING_SIZE = 68;
    private const STRETCH_END = 74;
    private const HOME = -1;
    private const SAFE_SQUARES = [0, 8, 17, 25, 34, 42, 51, 59];
    private const PLAYER_START_OFFSETS = [1 => 0, 2 => 17, 3 => 34, 4 => 51];
    private const TOKENS_PER_PLAYER = 4;
    private const HOME_EXIT_DICE = 5;
    private const CAPTURE_BONUS = 20;
    private const FINISH_BONUS = 10;
    private const MAX_CONSECUTIVE_DOUBLES = 3;
    private const BLOCKADE_SIZE = 2;

    private Closure $diceRoller;

    public function __construct(?Closure $diceRoller = null)
    {
        $this->diceRoller = $diceRoller ?? fn () => random_int(1, 6);
    }

    public function initialState(Collection $players): GameState
    {
        $count = $players->count();

        if ($count < 2 || $count > 4) {
            throw new InvalidArgumentException('Ludo requires 2 to 4 players.');
        }

        $tokens = [];
        $playerCollection = collect();
        for ($i = 1; $i <= $count; $i++) {
            $tokens[$i] = array_fill(0, self::TOKENS_PER_PLAYER, self::HOME);
            $playerCollection->put($i, $players->get($i - 1));
        }

        return new LudoState(
            tokens: $tokens,
            currentTurn: 1,
            pendingDice: [],
            phase: LudoPhase::Roll,
            consecutiveDoubles: 0,
            players: $playerCollection,
        );
    }

    public function makeState(array $data): GameState
    {
        return new LudoState(
            tokens: $data['tokens'],
            currentTurn: $data['currentTurn'],
            pendingDice: $data['pendingDice'],
            phase: LudoPhase::from($data['phase']),
            consecutiveDoubles: $data['consecutiveDoubles'],
            players: collect($data['players']),
        );
    }

    public function makeMoveData(array $data): MoveData
    {
        return new LudoMoveData(
            action: $data['action'] ?? null,
            tokenIndex: $data['tokenIndex'] ?? null,
            diceValue: $data['diceValue'] ?? null,
        );
    }

    public function validateMove(GameState $state, int $playerNumber, MoveData $moveData): bool
    {
        if (! $state instanceof LudoState) {
            throw new InvalidArgumentException('LudoEngine expects LudoState.');
        }

        if (! $moveData instanceof LudoMoveData) {
            throw new InvalidArgumentException('LudoEngine expects LudoMoveData.');
        }

        if ($playerNumber !== $state->currentTurn) {
            return false;
        }

        if ($state->phase === LudoPhase::Roll) {
            return $moveData->action === LudoPhase::Roll->value
                && $moveData->tokenIndex === null
                && $moveData->diceValue === null;
        }

        if ($moveData->action !== null) {
            return false;
        }

        if ($moveData->tokenIndex === null
            || $moveData->tokenIndex < 0
            || $moveData->tokenIndex >= self::TOKENS_PER_PLAYER) {
            return false;
        }

        if ($moveData->diceValue === null
            || ! in_array($moveData->diceValue, $state->pendingDice, true)) {
            return false;
        }

        return $this->canTokenMove($state, $playerNumber, $moveData->tokenIndex, $moveData->diceValue);
    }

    public function applyMove(GameState $state, int $playerNumber, MoveData $moveData): GameState
    {
        if (! $state instanceof LudoState) {
            throw new InvalidArgumentException('LudoEngine expects LudoState.');
        }

        if (! $moveData instanceof LudoMoveData) {
            throw new InvalidArgumentException('LudoEngine expects LudoMoveData.');
        }

        if ($state->phase === LudoPhase::Roll) {
            return $this->applyRoll($state);
        }

        return $this->applyTokenMove($state, $playerNumber, $moveData->tokenIndex, $moveData->diceValue);
    }

    public function checkGameOver(GameState $state): ?GameResult
    {
        if (! $state instanceof LudoState) {
            throw new InvalidArgumentException('LudoEngine expects LudoState.');
        }

        foreach ($state->tokens as $playerNumber => $tokens) {
            $allFinished = true;
            foreach ($tokens as $position) {
                if ($position !== self::STRETCH_END) {
                    $allFinished = false;
                    break;
                }
            }
            if ($allFinished) {
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
        if (! $state instanceof LudoState) {
            throw new InvalidArgumentException('LudoEngine expects LudoState.');
        }

        return $state->currentTurn;
    }

    private function applyRoll(LudoState $state): LudoState
    {
        $d1 = ($this->diceRoller)();
        $d2 = ($this->diceRoller)();
        $isDoubles = $d1 === $d2;
        $newDoubles = $isDoubles ? $state->consecutiveDoubles + 1 : 0;

        if ($newDoubles >= self::MAX_CONSECUTIVE_DOUBLES) {
            $tokens = $state->tokens;
            $leadIdx = $this->mostAdvancedToken($state, $state->currentTurn);
            if ($leadIdx !== null) {
                $tokens[$state->currentTurn][$leadIdx] = self::HOME;
            }

            return new LudoState(
                tokens: $tokens,
                currentTurn: $this->nextPlayer($state),
                pendingDice: [],
                phase: LudoPhase::Roll,
                consecutiveDoubles: 0,
                players: $state->players,
            );
        }

        $candidate = [$d1, $d2];

        if (! $this->hasAnySpendableValue($state, $state->currentTurn, $candidate)) {
            return new LudoState(
                tokens: $state->tokens,
                currentTurn: $this->nextPlayer($state),
                pendingDice: [],
                phase: LudoPhase::Roll,
                consecutiveDoubles: 0,
                players: $state->players,
            );
        }

        return new LudoState(
            tokens: $state->tokens,
            currentTurn: $state->currentTurn,
            pendingDice: $candidate,
            phase: LudoPhase::Move,
            consecutiveDoubles: $newDoubles,
            players: $state->players,
        );
    }

    private function applyTokenMove(LudoState $state, int $playerNumber, int $tokenIndex, int $diceValue): LudoState
    {
        $cur = $state->tokens[$playerNumber][$tokenIndex];
        $newPos = $cur === self::HOME ? 0 : $cur + $diceValue;

        $tokens = $state->tokens;
        $tokens[$playerNumber][$tokenIndex] = $newPos;

        $captured = false;
        if ($newPos < self::RING_SIZE) {
            $absLanded = (self::PLAYER_START_OFFSETS[$playerNumber] + $newPos) % self::RING_SIZE;

            if (! in_array($absLanded, self::SAFE_SQUARES, true)) {
                foreach ($tokens as $opPlayer => $opTokens) {
                    if ($opPlayer === $playerNumber) {
                        continue;
                    }
                    foreach ($opTokens as $opIdx => $opPos) {
                        if ($opPos < 0 || $opPos >= self::RING_SIZE) {
                            continue;
                        }
                        $opAbs = (self::PLAYER_START_OFFSETS[$opPlayer] + $opPos) % self::RING_SIZE;
                        if ($opAbs === $absLanded) {
                            $tokens[$opPlayer][$opIdx] = self::HOME;
                            $captured = true;
                        }
                    }
                }
            }
        }

        $finished = $newPos === self::STRETCH_END;

        $pending = $state->pendingDice;
        $spentIdx = array_search($diceValue, $pending, true);
        array_splice($pending, $spentIdx, 1);

        if ($captured) {
            $pending[] = self::CAPTURE_BONUS;
        }
        if ($finished) {
            $pending[] = self::FINISH_BONUS;
        }

        $nextState = new LudoState(
            tokens: $tokens,
            currentTurn: $playerNumber,
            pendingDice: $pending,
            phase: LudoPhase::Move,
            consecutiveDoubles: $state->consecutiveDoubles,
            players: $state->players,
        );

        if (count($pending) > 0 && $this->hasAnySpendableValue($nextState, $playerNumber, $pending)) {
            return $nextState;
        }

        $extraTurn = count($pending) === 0 && $state->consecutiveDoubles > 0;

        return new LudoState(
            tokens: $tokens,
            currentTurn: $extraTurn ? $playerNumber : $this->nextPlayer($state),
            pendingDice: [],
            phase: LudoPhase::Roll,
            consecutiveDoubles: $extraTurn ? $state->consecutiveDoubles : 0,
            players: $state->players,
        );
    }

    private function nextPlayer(LudoState $state): int
    {
        $count = $state->players->count();

        return ($state->currentTurn % $count) + 1;
    }

    private function canTokenMove(LudoState $state, int $playerNumber, int $tokenIndex, int $diceValue): bool
    {
        $cur = $state->tokens[$playerNumber][$tokenIndex] ?? null;

        if ($cur === null) {
            return false;
        }

        if ($cur === self::STRETCH_END) {
            return false;
        }

        if ($cur === self::HOME) {
            if ($diceValue !== self::HOME_EXIT_DICE) {
                return false;
            }

            return ! $this->pathBlocked($state, $playerNumber, self::HOME, 0);
        }

        if ($cur + $diceValue > self::STRETCH_END) {
            return false;
        }

        return ! $this->pathBlocked($state, $playerNumber, $cur, $cur + $diceValue);
    }

    private function hasAnySpendableValue(LudoState $state, int $playerNumber, array $values): bool
    {
        foreach ($values as $value) {
            for ($i = 0; $i < self::TOKENS_PER_PLAYER; $i++) {
                if ($this->canTokenMove($state, $playerNumber, $i, $value)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function pathBlocked(LudoState $state, int $playerNumber, int $from, int $to): bool
    {
        for ($pos = $from + 1; $pos <= $to; $pos++) {
            if ($pos >= self::RING_SIZE) {
                break;
            }
            $abs = (self::PLAYER_START_OFFSETS[$playerNumber] + $pos) % self::RING_SIZE;

            foreach ($state->tokens as $opPlayer => $opTokens) {
                if ($opPlayer === $playerNumber) {
                    continue;
                }
                $count = 0;
                foreach ($opTokens as $opPos) {
                    if ($opPos < 0 || $opPos >= self::RING_SIZE) {
                        continue;
                    }
                    $opAbs = (self::PLAYER_START_OFFSETS[$opPlayer] + $opPos) % self::RING_SIZE;
                    if ($opAbs === $abs) {
                        $count++;
                    }
                }
                if ($count >= self::BLOCKADE_SIZE) {
                    return true;
                }
            }
        }

        return false;
    }

    private function mostAdvancedToken(LudoState $state, int $playerNumber): ?int
    {
        $bestIdx = null;
        $bestPos = self::HOME;

        foreach ($state->tokens[$playerNumber] as $idx => $pos) {
            if ($pos === self::HOME || $pos === self::STRETCH_END) {
                continue;
            }
            if ($pos > $bestPos) {
                $bestPos = $pos;
                $bestIdx = $idx;
            }
        }

        return $bestIdx;
    }
}
