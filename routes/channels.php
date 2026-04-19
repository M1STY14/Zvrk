<?php

use App\Broadcasting\GameChatChannel;
use App\Broadcasting\GameSessionChannel;
use App\Broadcasting\LobbyChannel;
use App\Broadcasting\UserChannel;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', UserChannel::class);

Broadcast::channel('game.{gameSession}', GameSessionChannel::class);
Broadcast::channel('lobby.{gameSlug}', LobbyChannel::class);
Broadcast::channel('game.{gameSession}.chat', GameChatChannel::class);
