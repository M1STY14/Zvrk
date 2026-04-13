<?php

namespace App\Policies;

use App\Models\GameSession;
use App\Models\User;
use Illuminate\Auth\Access\Response;

final readonly class GameSessionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, GameSession $gameSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, GameSession $gameSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, GameSession $gameSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, GameSession $gameSession): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, GameSession $gameSession): bool
    {
        return false;
    }

    public function join(User $user, GameSession $gameSession): bool
    {
        $isHost = $gameSession->host_user_id === $user->id;
        $isPlayer = $gameSession->players()->where('user_id', $user->id)->exists();

        if (! $isHost && ! $isPlayer) {
            return false;
        }

        return true;
    }
}
