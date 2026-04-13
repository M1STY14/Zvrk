<?php

namespace App\Broadcasting;

use App\Models\User;

final class LobbyChannel
{
    public function join(User $user, string $gameSlug): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
        ];
    }
}
