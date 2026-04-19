<?php

namespace App\Policies;

use App\Enums\GameStatus;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Auth\Access\Response;

final readonly class GameSessionPolicy
{
    public function join(User $user, GameSession $gameSession): Response
    {
        if ($gameSession->status->isNot(GameStatus::Pending)) {
            return Response::deny('This game session is no longer accepting players.');
        }

        if ($gameSession->players()->count() >= $gameSession->max_players) {
            return Response::deny('This game session is full.');
        }

        return Response::allow();
    }

    public function listen(User $user, GameSession $gameSession): Response
    {
        $isPlayer = $gameSession->players()
            ->where('user_id', $user->id)
            ->exists();

        if (! $isPlayer) {
            return Response::deny('You are not a player in this game session.');
        }

        return Response::allow();
    }

    public function start(User $user, GameSession $gameSession): Response
    {
        if ($gameSession->host_user_id !== $user->id) {
            return Response::deny('Only the host can start the game.');
        }

        if ($gameSession->status->isNot(GameStatus::Pending)) {
            return Response::deny('This game session cannot be started.');
        }

        if ($gameSession->players()->count() < $gameSession->game->min_players) {
            return Response::deny('Not enough players to start the game.');
        }

        return Response::allow();
    }
}
