<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\User;
use App\Models\GameSession;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('game.{sessionId}', function (User $user, GameSession $session) : array|bool {
    $isHost = $session->host_user_id === $user->id;
    $isPlayer = $session->players()->where('user_id', $user->id)->exists();
    if (!$isHost && !$isPlayer) return false;
    return [
        'id' => $user->id,
        'name' => $user->name,
    ];
});
