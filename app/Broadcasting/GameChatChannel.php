<?php

namespace App\Broadcasting;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

final class GameChatChannel
{
    use AuthorizesRequests;

    /**
     * @throws AuthorizationException
     */
    public function join(User $user, GameSession $gameSession): bool
    {
        $this->authorize('join', $gameSession);

        return true;
    }
}
