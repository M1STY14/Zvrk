<?php

namespace App\Services;

use App\Data\GameResult;
use App\Enums\GameStatus;
use App\Events\GameEnded;
use App\Events\GameStarted;
use App\Events\MoveMade;
use App\Events\PlayerJoinedLobby;
use App\Events\PlayerLeftLobby;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
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

        return [
            'state' => $stateArray,
            'move_number' => $moveNumber,
            'game_over' => $gameResult !== null,
            'result' => $gameResult?->toArray(),
        ];
    }

    public function removePlayer(GameSession $session, User $user): void
    {
        if ($session->status->is(GameStatus::Playing)) {
            $this->handleGameAbandonment($session, $user);
        } elseif ($session->status->is(GameStatus::Pending)) {
            $this->handlePendingGameRemoval($session, $user);
        }
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

    private function handleGameAbandonment(GameSession $session, User $user): void
    {
        $session->players()->where('user_id', $user->id)->delete();

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
        $session->players()->where('user_id', $user->id)->delete();

        if ($session->host_user_id === $user->id) {
            $session->update(['status' => GameStatus::Abandoned]);
        }

        PlayerLeftLobby::dispatch($session->game->slug, $user->id, $user->name);
    }
}
