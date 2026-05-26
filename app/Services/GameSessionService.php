<?php

namespace App\Services;

use App\Ai\TicTacToeBot;
use App\Contracts\GameContract;
use App\Data\GameResult;
use App\Data\GameState;
use App\Data\TicTacToeState;
use App\Enums\GameEndReason;
use App\Enums\GameStatus;
use App\Events\GameEnded;
use App\Events\GameStarted;
use App\Events\LobbyRoomClosed;
use App\Events\MoveMade;
use App\Events\PlayerConnectionChanged;
use App\Events\PlayerJoinedLobby;
use App\Events\PlayerLeftLobby;
use App\Games\TicTacToeEngine;
use App\Jobs\ForfeitDisconnectedPlayerJob;
use App\Models\GamePlayer;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Throwable;

final readonly class GameSessionService
{
    public function __construct(
        private GameEngineManager $engineManager,
    ) {}

    public function addPlayer(GameSession $session, User $user): void
    {
        $session->players()->create([
            'user_id' => $user->id,
            'player_number' => $session->players()->max('player_number') + 1,
            'joined_at' => now(),
        ]);

        PlayerJoinedLobby::dispatch($session->game->slug, $user->id, $user->name);
    }

    public function startGameWithAi(GameSession $session): void
    {
        $session->load(['players', 'game']);

        $aiUser = $this->ensureAiUser();

        if (! $session->players()->where('user_id', $aiUser->id)->exists()) {
            $session->players()->create([
                'user_id' => $aiUser->id,
                'player_number' => $session->players()->max('player_number') + 1,
                'joined_at' => now(),
            ]);
        }

        $this->startGame($session);
    }

    private function ensureAiUser(): User
    {
        return User::query()->firstOrCreate([
            'email' => TicTacToeBot::EMAIL,
        ], [
            'name' => TicTacToeBot::NAME,
            'email_verified_at' => now(),
            'password' => Hash::make('ai-bot-secret'),
        ]);
    }

    public function startGame(GameSession $session): void
    {
        $engine = $this->engineManager->resolve($session->game->slug);

        $playerUserIds = $session->players()
            ->orderBy('player_number')
            ->pluck('user_id');

        $initialState = $engine->initialState($playerUserIds);
        $stateArray = $initialState->toArray();

        $session->update([
            'status' => GameStatus::Playing,
            'state' => $stateArray,
            'started_at' => now(),
        ]);

        $startingPlayerId = $stateArray['players'][$engine->getCurrentTurn($initialState)];

        broadcast(new GameStarted(
            sessionId: $session->id,
            startingPlayerId: $startingPlayerId,
            state: $initialState,
        ));
    }

    /**
     * @throws ValidationException
     * @throws ModelNotFoundException
     * @throws InvalidArgumentException
     * @throws Throwable
     */
    public function applyMove(GameSession $session, User $user, array $moveDataArray): array
    {
        $player = $session->players()->where('user_id', $user->id)->firstOrFail();
        $engine = $this->engineManager->resolve($session->game->slug);

        [$stateArray, $moveNumber, $gameResult] = DB::transaction(function () use ($session, $engine, $player, $user, $moveDataArray) {
            $session = GameSession::query()->lockForUpdate()->findOrFail($session->id);

            $state = $engine->makeState($session->state);
            $moveData = $engine->makeMoveData($moveDataArray);

            if (! $engine->validateMove($state, $player->player_number, $moveData)) {
                throw ValidationException::withMessages([
                    'move_data' => ['Invalid move.'],
                ]);
            }

            $newState = $engine->applyMove($state, $player->player_number, $moveData);
            $stateArray = $newState->toArray();
            $moveNumber = $session->moves()->count() + 1;

            $session->update(['state' => $stateArray]);

            $session->moves()->create([
                'user_id' => $user->id,
                'move_number' => $moveNumber,
                'move_data' => $moveDataArray,
            ]);

            $gameResult = $engine->checkGameOver($newState);

            if ($gameResult instanceof GameResult) {
                $this->finish($session, $gameResult->winner);
            }

            return [$stateArray, $moveNumber, $gameResult];
        });

        $this->broadcastMoveResult($session, $user, $engine, $stateArray, $gameResult);

        if ($gameResult === null) {
            [$stateArray, $moveNumber, $gameResult] = $this->playBotTurnIfNeeded($session->load('players'), $engine, $stateArray, $moveNumber);
        }

        return [
            'state' => $stateArray,
            'move_number' => $moveNumber,
            'game_over' => $gameResult !== null,
            'result' => $gameResult?->toArray(),
        ];
    }

    /**
     * @throws Throwable
     */
    private function playBotTurnIfNeeded(GameSession $session, mixed $engine, array $stateArray, int $previousMoveNumber): array
    {
        if (! $engine instanceof TicTacToeEngine) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $botUser = User::query()->where('email', TicTacToeBot::EMAIL)->first();

        if ($botUser === null) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $botPlayer = $session->players()->where('user_id', $botUser->id)->first();

        if ($botPlayer === null) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $state = $engine->makeState($stateArray);

        if (! $state instanceof TicTacToeState) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $currentTurn = $engine->getCurrentTurn($state);
        $nextPlayerId = $stateArray['players'][$currentTurn] ?? null;

        if ($nextPlayerId !== $botUser->id) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $bot = new TicTacToeBot;
        $moveData = $bot->selectMove($state);

        $gameResult = null;
        $moveNumber = 0;

        DB::transaction(function () use ($session, $engine, $botPlayer, $botUser, $moveData, &$stateArray, &$moveNumber, &$gameResult) {
            $session = GameSession::query()->lockForUpdate()->findOrFail($session->id);

            $state = $engine->makeState($session->state);
            $newState = $engine->applyMove($state, $botPlayer->player_number, $moveData);
            $stateArray = $newState->toArray();
            $moveNumber = $session->moves()->count() + 1;

            $session->update(['state' => $stateArray]);

            $session->moves()->create([
                'user_id' => $botUser->id,
                'move_number' => $moveNumber,
                'move_data' => ['row' => $moveData->row, 'col' => $moveData->col],
            ]);

            $gameResult = $engine->checkGameOver($newState);

            if ($gameResult instanceof GameResult) {
                $this->finish($session, $gameResult->winner);
            }
        });

        $this->broadcastMoveResult($session, $botUser, $engine, $stateArray, $gameResult);

        return [$stateArray, $moveNumber, $gameResult];
    }

    public function markPlayerConnected(GameSession $session, User $user): void
    {
        $updated = $session->players()
            ->where('user_id', $user->id)
            ->where('is_connected', false)
            ->update([
                'is_connected' => true,
                'disconnected_at' => null,
            ]);

        if ($updated === 0) {
            return;
        }

        broadcast(new PlayerConnectionChanged(
            sessionId: $session->id,
            userId: $user->id,
            isConnected: true,
        ))->toOthers();
    }

    public function markPlayerDisconnected(GameSession $session, User $user): void
    {
        $updated = $session->players()
            ->where('user_id', $user->id)
            ->where('is_connected', true)
            ->update([
                'is_connected' => false,
                'disconnected_at' => now(),
            ]);

        if ($updated === 0) {
            return;
        }

        broadcast(new PlayerConnectionChanged(
            sessionId: $session->id,
            userId: $user->id,
            isConnected: false,
        ))->toOthers();

        $session->refresh();

        if ($session->status->is(GameStatus::Pending) && $session->host_user_id === $user->id) {
            $this->abandonPendingRoomByHost($session, $user, GameEndReason::HostLeft);

            return;
        }

        if ($session->status->is(GameStatus::Playing) && ! $this->isAiUser($user)) {
            ForfeitDisconnectedPlayerJob::dispatch($session->id, $user->id)
                ->delay(now()->addSeconds(60));
        }
    }

    /**
     * @throws Throwable
     */
    public function abandonPendingRoomByHost(GameSession $session, User $host, GameEndReason $reason): void
    {
        $session->loadMissing('game');

        $abandoned = DB::transaction(function () use ($session, $host, $reason) {
            $session = GameSession::query()->lockForUpdate()->find($session->id);

            if ($session === null
                || $session->status->isNot(GameStatus::Pending)
                || $session->host_user_id !== $host->id) {
                return false;
            }

            $session->players()->delete();
            $this->cancel($session, $reason);

            return true;
        });

        if (! $abandoned) {
            return;
        }

        PlayerLeftLobby::dispatch($session->game->slug, $host->id, $host->name);

        broadcast(new LobbyRoomClosed(
            sessionId: $session->id,
            gameSlug: $session->game->slug,
        ));
    }

    /**
     * Pending -> Canceled. The game never started; no winner.
     * Operates on the given (already-locked) session instance.
     */
    public function cancel(GameSession $session, GameEndReason $reason): void
    {
        $session->update(['end_reason' => $reason]);
        $session->status()->transitionTo(GameStatus::Canceled);
    }

    /**
     * Playing -> Finished. A normal win or draw decided by the engine.
     * Operates on the given (already-locked) session instance.
     */
    public function finish(GameSession $session, ?string $winnerUserId): void
    {
        $session->update([
            'winner_user_id' => $winnerUserId,
            'finished_at' => now()
        ]);
        $session->status()->transitionTo(GameStatus::Finished);
    }

    public function forfeitDueToDisconnect(GameSession $session, User $disconnectedUser): void
    {
        $session->loadMissing(['game', 'players']);

        $player = $session->players->firstWhere('user_id', $disconnectedUser->id);

        if ($player === null || $player->is_connected || $player->disconnected_at === null) {
            return;
        }

        if ($player->disconnected_at->diffInSeconds(now()) < 60) {
            return;
        }

        $this->forfeit($session, $disconnectedUser, GameEndReason::Disconnect);
    }

    /**
     * Remove a player from an in-progress game.
     *
     * The game only ends when a single human player is left standing; with more
     * players still in (e.g. a 4-player Ludo match) the game continues and the
     * forfeiting player is simply skipped.
     */
    public function forfeit(GameSession $session, User $loser, GameEndReason $reason): void
    {
        $session->loadMissing('game');

        $engine = $this->engineManager->resolve($session->game->slug);

        $outcome = DB::transaction(function () use ($session, $loser, $reason, $engine) {
            $session = GameSession::query()
                ->lockForUpdate()
                ->with(['players.user', 'game'])
                ->find($session->id);

            if ($session === null || $session->status->isNot(GameStatus::Playing)) {
                return null;
            }

            $loserPlayer = $session->players->firstWhere('user_id', $loser->id);

            if ($loserPlayer === null) {
                return null;
            }

            $state = $engine->makeState($session->state);
            $newState = $engine->forfeitPlayer($state, $loserPlayer->player_number);

            $remainingHumans = collect($engine->activePlayerNumbers($newState))
                ->map(fn (int $number): ?GamePlayer => $session->players->firstWhere('player_number', $number))
                ->filter()
                ->reject(fn (GamePlayer $player): bool => $this->isAiUser($player->user))
                ->values();

            if ($remainingHumans->count() > 1) {
                $session->update(['state' => $newState->toArray()]);

                return ['ended' => false, 'state' => $newState];
            }

            $winnerUserId = $remainingHumans->first()?->user_id;

            $session->update([
                'state' => $newState->toArray(),
                'end_reason' => $reason,
                'winner_user_id' => $winnerUserId,
                'finished_at' => now()
            ]);
            $session->status()->transitionTo(GameStatus::Forfeited);

            return ['ended' => true, 'state' => $newState, 'winnerUserId' => $winnerUserId];
        });

        if ($outcome === null) {
            return;
        }

        if ($outcome['ended']) {
            broadcast(new GameEnded(
                sessionId: $session->id,
                winner: $outcome['winnerUserId'],
                draw: false,
                state: $outcome['state'],
                reason: $reason,
            ));

            return;
        }

        $this->broadcastForfeitContinues($session, $engine, $outcome['state'], $loser);
    }

    private function broadcastForfeitContinues(GameSession $session, GameContract $engine, GameState $state, User $loser): void
    {
        $stateArray = $state->toArray();
        $nextPlayerId = $stateArray['players'][$engine->getCurrentTurn($state)] ?? null;

        broadcast(new MoveMade(
            sessionId: $session->id,
            playerId: $loser->id,
            nextPlayerId: $nextPlayerId,
            state: $state,
        ));
    }

    private function isAiUser(User $user): bool
    {
        return $user->email === TicTacToeBot::EMAIL;
    }

    public function removePlayer(GameSession $session, User $user): void
    {
        if ($session->status->is(GameStatus::Playing)) {
            $this->forfeit($session, $user, GameEndReason::PlayerLeft);
        } elseif ($session->status->isFinished()) {
            $this->removeAllPlayers($session);
        } elseif ($session->status->is(GameStatus::Pending)) {
            $this->handlePendingGameRemoval($session, $user);
        }
    }

    private function removeAllPlayers(GameSession $session): void
    {
        $session->players()->delete();
    }

    private function broadcastMoveResult(GameSession $session, User $user, mixed $engine, array $stateArray, mixed $gameResult): void
    {
        $state = $engine->makeState($stateArray);
        $nextPlayerId = $stateArray['players'][$engine->getCurrentTurn($state)] ?? null;

        broadcast(new MoveMade(
            sessionId: $session->id,
            playerId: $user->id,
            nextPlayerId: $nextPlayerId,
            state: $state,
        ))->toOthers();

        if ($gameResult !== null) {
            broadcast(new GameEnded(
                sessionId: $session->id,
                winner: $gameResult->winner,
                draw: $gameResult->draw,
                state: $state,
            ));
        }
    }

    private function handlePendingGameRemoval(GameSession $session, User $user): void
    {
        if ($session->host_user_id === $user->id) {
            $this->abandonPendingRoomByHost($session, $user, GameEndReason::RoomClosed);

            return;
        }

        $session->players()->where('user_id', $user->id)->delete();

        PlayerLeftLobby::dispatch($session->game->slug, $user->id, $user->name);
    }
}
