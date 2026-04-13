<?php

namespace App\Broadcasting;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

final class GameSessionChannel
{
    use AuthorizesRequests;

    /**
     * @throws AuthorizationException
     */
    public function join(User $user, GameSession $gameSession): array|false
    {
        $this->authorize('join', $gameSession);

        return [
            'id' => $user->id,
            'name' => $user->name,
        ];
    }
}
