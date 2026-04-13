<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class PlayerJoinedLobby implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $gameSlug,
        public string $playerId,
        public string $playerName,
    ) {
    }

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("lobby.{$this->gameSlug}");
    }

    public function broadcastAs(): string
    {
        return 'player.joined.lobby';
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
