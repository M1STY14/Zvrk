<?php

namespace App\Http\Controllers;

use App\Data\MakeMoveRequest;
use App\Enums\GameStatus;
use App\Events\PlayerLeftLobby;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class GameSessionController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly GameSessionService $gameSessionService,
    ) {}

    public function show(GameSession $gameSession): Response
    {
        $gameSession->load(['players.user:id,name,avatar', 'game']);

        return Inertia::render('Game/Play', [
            'session' => [
                'id' => $gameSession->id,
                'name' => $gameSession->name,
                'status' => $gameSession->status->value,
                'state' => $gameSession->state,
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
            return to_route('lobby.show', [$gameSession->game->slug, $gameSession->id]);
        }

        $this->gameSessionService->addPlayer($gameSession, $user);

        return to_route('lobby.show', [$gameSession->game->slug, $gameSession->id]);
    }

    /**
     * @throws AuthorizationException
     */
    public function start(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('start', $gameSession);

        $this->gameSessionService->startGame($gameSession);

        return to_route('game.show', $gameSession->id);
    }

    /**
     * @throws AuthorizationException
     */
    public function startWithAi(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('startVsAi', $gameSession);

        $this->gameSessionService->startGameWithAi($gameSession);

        return to_route('game.show', $gameSession->id);
    }

    /**
     * @throws AuthorizationException
     */
    public function closeRoom(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->authorize('closeRoom', $gameSession);

        $gameSession->update(['status' => GameStatus::Abandoned]);

        $gameSession->players()->where('user_id', $user->id)->delete();

        PlayerLeftLobby::dispatch($gameSession->game->slug, $user->id, $user->name);

        return to_route('lobby.index', $gameSession->game->slug);
    }

    /**
     * @throws ValidationException
     */
    public function move(MakeMoveRequest $makeMoveRequest, GameSession $gameSession, #[CurrentUser] User $user): JsonResponse
    {
        if ($gameSession->status->isNot(GameStatus::Playing)) {
            return response()->json(['message' => 'Game is not in progress.'], 422);
        }

        return response()->json(
            $this->gameSessionService->applyMove($gameSession->load('game'), $user, $makeMoveRequest->move_data)
        );
    }

    public function leave(GameSession $gameSession, #[CurrentUser] User $user): RedirectResponse
    {
        $gameSession->load('game');

        $this->gameSessionService->removePlayer($gameSession, $user);

        return to_route('lobby.index', $gameSession->game->slug);
    }
}
