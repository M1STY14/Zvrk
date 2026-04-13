<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PlayerLeftLobby implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $gameSlug,
        public string $playerId,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return [
            new PresenceChannel("lobby.{$this->gameSlug}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'player.left.lobby';
    }

    public function broadcastWith(): array
    {
        return [
            'gameSlug' => $this->gameSlug,
            'player' => [
                'id' => $this->playerId,
                'name' => $this->playerName,
            ],
        ];
    }
}