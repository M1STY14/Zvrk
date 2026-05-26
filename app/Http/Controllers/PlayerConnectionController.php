<?php

namespace App\Http\Controllers;

use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

final class PlayerConnectionController extends Controller
{
    public function __construct(
        private readonly GameSessionService $gameSessionService,
    ) {}

    /**
     * A player reports their own presence. Membership is guaranteed by the
     * EnsurePlayerInGame middleware, so a player can only ever (dis)connect themselves.
     */
    public function connect(GameSession $gameSession, #[CurrentUser] User $user): JsonResponse
    {
        $this->gameSessionService->markPlayerConnected($gameSession, $user);

        return response()->json(['ok' => true]);
    }

    public function disconnect(GameSession $gameSession, #[CurrentUser] User $user): JsonResponse
    {
        $this->gameSessionService->markPlayerDisconnected($gameSession, $user);

        return response()->json(['ok' => true]);
    }
}
