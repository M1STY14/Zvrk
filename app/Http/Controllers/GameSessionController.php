<?php

namespace App\Http\Controllers;

use App\Data\MakeMoveRequest;
use App\Enums\GameEndReason;
use App\Enums\GameStatus;
use App\Enums\GameType;
use App\Events\PlayerLeftLobby;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameEngineManager;
use App\Services\GameSessionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

final class GameSessionController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly GameSessionService $gameSessionService,
        private readonly GameEngineManager $engineManager,
    ) {}

    public function show(GameSession $gameSession): Response
    {
        $gameSession->load(['players.user:id,name,avatar', 'game']);

        return Inertia::render(GameType::getInertiaPageFrom($gameSession), [
            'session' => [
                'id' => $gameSession->id,
                'name' => $gameSession->name,
                'is_finished' => $gameSession->status->isFinished(),
                'state' => $this->stateForCurrentPlayer($gameSession, auth()->id()),
                'winner_user_id' => $gameSession->winner_user_id,
                'game' => [
                    'slug' => $gameSession->game->slug,
                    'name' => $gameSession->game->name,
                ],
                'players' => $gameSession->players
                    ->sortBy('player_number')
                    ->values()
                    ->map(fn ($player) => [
                        'id' => $player->id,
                        'user_id' => $player->user_id,
                        'player_number' => $player->player_number,
                        'is_connected' => $player->is_connected,
                        'user' => [
                            'id' => $player->user->id,
                            'name' => $player->user->name,
                        ],
                    ]),
            ],
        ]);
    }

    /**
     * @throws AuthorizationException
     */
    public function join(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $this->authorize('join', $gameSession);

        $gameSession->load('game');

        if ($gameSession->has($user)) {
            return redirect()->route('lobby.show', [$gameSession->game->slug, $gameSession->id]);
        }

        $this->gameSessionService->addPlayer($gameSession, $user);

        return redirect()->route('lobby.show', [$gameSession->game->slug, $gameSession->id]);
    }

    /**
     * @throws AuthorizationException
     */
    public function start(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('start', $gameSession);

        $this->gameSessionService->startGame($gameSession);

        return redirect()->route('game.show', $gameSession->id);
    }

    /**
     * @throws AuthorizationException
     */
    public function startWithAi(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('startVsAi', $gameSession);

        $this->gameSessionService->startGameWithAi($gameSession);

        return redirect()->route('game.show', $gameSession->id);
    }

    /**
     * @throws AuthorizationException
     */
    public function closeRoom(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('closeRoom', $gameSession);

        $this->gameSessionService->cancel($gameSession, GameEndReason::RoomClosed);

        $gameSession->players()->where('user_id', $user->id)->delete();

        PlayerLeftLobby::dispatch($gameSession->game->slug, $user->id, $user->name);

        return redirect()->route('lobby.index', $gameSession->game->slug);
    }

    /**
     * @throws ValidationException
     * @throws ModelNotFoundException
     * @throws InvalidArgumentException
     */
    public function move(MakeMoveRequest $makeMoveRequest, GameSession $gameSession, #[CurrentUser] User $user): JsonResponse
    {
        if ($gameSession->status->isNot(GameStatus::Playing)) {
            return response()->json(['message' => 'Game is not in progress.'], 422);
        }

        $gameSession->load('game');
        $result = $this->gameSessionService->applyMove($gameSession, $user, $makeMoveRequest->move_data);

        $engine = $this->engineManager->resolve($gameSession->game->slug);
        $state = $engine->makeState($result['state']);
        $player = $gameSession->players->firstWhere('user_id', $user->id);
        $result['state'] = $player
            ? $state->stateForPlayer($player->player_number)
            : $state->toBroadcastArray();

        return response()->json($result);
    }

    private function stateForCurrentPlayer(GameSession $gameSession, ?string $userId): ?array
    {
        if ($gameSession->state === null) {
            return null;
        }

        $engine = $this->engineManager->resolve($gameSession->game->slug);
        $state = $engine->makeState($gameSession->state);
        $player = $gameSession->players->firstWhere('user_id', $userId);

        return $player
            ? $state->stateForPlayer($player->player_number)
            : $state->toBroadcastArray();
    }

    public function leave(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->gameSessionService->removePlayer($gameSession, $user);

        return redirect()->route('lobby.index', $gameSession->game->slug);
    }
}
