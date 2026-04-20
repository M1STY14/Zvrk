<?php

namespace App\Services;

use App\Data\GameResult;
use App\Enums\GameStatus;
use App\Events\GameEnded;
use App\Events\GameStarted;
use App\Events\MoveMade;
use App\Events\PlayerJoinedLobby;
use App\Ai\TicTacToeBot;
use App\Events\PlayerLeftLobby;
use App\Games\TicTacToeEngine;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

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
        return User::firstOrCreate([
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
            board: $stateArray['board'],
            startingPlayerId: $startingPlayerId,
        ));
    }

    /**
     * @throws ValidationException
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
                $session->update([
                    'status' => GameStatus::Finished,
                    'winner_user_id' => $gameResult->winner,
                    'finished_at' => now(),
                ]);
            }

            return [$stateArray, $moveNumber, $gameResult];
        });

        $this->broadcastMoveResult($session, $user, $engine, $stateArray, $moveDataArray, $gameResult);

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

    private function playBotTurnIfNeeded(GameSession $session, mixed $engine, array $stateArray, int $previousMoveNumber): array
    {
        if (! $engine instanceof TicTacToeEngine) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $botUser = User::where('email', TicTacToeBot::EMAIL)->first();

        if ($botUser === null) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $botPlayer = $session->players()->where('user_id', $botUser->id)->first();

        if ($botPlayer === null) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $state = $engine->makeState($stateArray);
        $currentTurn = $engine->getCurrentTurn($state);
        $nextPlayerId = $stateArray['players'][$currentTurn] ?? null;

        if ($nextPlayerId !== $botUser->id) {
            return [$stateArray, $previousMoveNumber, null];
        }

        $bot = new TicTacToeBot();
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
                $session->update([
                    'status' => GameStatus::Finished,
                    'winner_user_id' => $gameResult->winner,
                    'finished_at' => now(),
                ]);
            }
        });

        $this->broadcastMoveResult($session, $botUser, $engine, $stateArray, ['row' => $moveData->row, 'col' => $moveData->col], $gameResult);

        return [$stateArray, $moveNumber, $gameResult];
    }

    public function removePlayer(GameSession $session, User $user): void
    {
        if ($session->status->is(GameStatus::Playing)) {
            $this->handleGameAbandonment($session);
        } elseif ($session->status->is(GameStatus::Finished) || $session->status->is(GameStatus::Abandoned)) {
            $this->removeAllPlayers($session);
        } elseif ($session->status->is(GameStatus::Pending)) {
            $this->handlePendingGameRemoval($session, $user);
        }
    }

    private function removeAllPlayers(GameSession $session): void
    {
        $session->players()->delete();
    }

    private function broadcastMoveResult(GameSession $session, User $user, mixed $engine, array $stateArray, array $moveDataArray, mixed $gameResult): void
    {
        $state = $engine->makeState($stateArray);
        $nextPlayerId = $stateArray['players'][$engine->getCurrentTurn($state)] ?? null;

        broadcast(new MoveMade(
            sessionId: $session->id,
            playerId: $user->id,
            row: $moveDataArray['row'],
            column: $moveDataArray['col'],
            board: $stateArray['board'],
            nextPlayerId: $nextPlayerId,
        ))->toOthers();

        if ($gameResult !== null) {
            broadcast(new GameEnded(
                sessionId: $session->id,
                winner: $gameResult->winner,
                draw: $gameResult->draw,
                board: $stateArray['board'],
            ));
        }
    }

    private function handleGameAbandonment(GameSession $session): void
    {
        $session->players()->delete();

        $session->update([
            'status' => GameStatus::Abandoned,
            'finished_at' => now(),
        ]);

        broadcast(new GameEnded(
            sessionId: $session->id,
            winner: null,
            draw: false,
            board: $session->state['board'] ?? [],
        ));
    }

    private function handlePendingGameRemoval(GameSession $session, User $user): void
    {
        if ($session->host_user_id === $user->id) {
            $session->players()->delete();
            $session->update(['status' => GameStatus::Abandoned]);
        } else {
            $session->players()->where('user_id', $user->id)->delete();
        }

        PlayerLeftLobby::dispatch($session->game->slug, $user->id, $user->name);
    }
}
