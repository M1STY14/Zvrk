<?php

namespace App\Jobs;

use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class ForfeitDisconnectedPlayerJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $gameSessionId,
        public string $userId,
    ) {}

    public function handle(GameSessionService $gameSessionService): void
    {
        $session = GameSession::query()->with('game')->find($this->gameSessionId);
        $user = User::query()->find($this->userId);

        if ($session === null || $user === null) {
            return;
        }

        $gameSessionService->forfeitDueToDisconnect($session, $user);
    }
}
