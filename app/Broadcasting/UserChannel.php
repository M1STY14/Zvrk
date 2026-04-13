<?php

namespace App\Broadcasting;

use App\Models\User;

final class UserChannel
{
    public function join(User $user, string $id): bool
    {
        return $user->id === $id;
    }
}
