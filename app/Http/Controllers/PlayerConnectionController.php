<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;

final class PlayerConnectionController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly GameSessionService $gameSessionService,
    ) {}

    /**
     * @throws AuthorizationException
     */
    public function connect(GameSession $gameSession, User $user): JsonResponse
    {
        $this->authorize('listen', $gameSession);

        if (! $gameSession->has($user)) {
            abort(404);
        }

        $this->gameSessionService->markPlayerConnected($gameSession, $user);

        return response()->json(['ok' => true]);
    }

    public function disconnect(GameSession $gameSession, User $user): JsonResponse
    {
        $this->authorize('listen', $gameSession);

        if (! $gameSession->has($user)) {
            abort(404);
        }

        $this->gameSessionService->markPlayerDisconnected($gameSession, $user);

        return response()->json(['ok' => true]);
    }
}
