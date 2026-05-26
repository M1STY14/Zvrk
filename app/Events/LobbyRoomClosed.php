<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class LobbyRoomClosed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $gameSlug,
    ) {}

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("game.{$this->sessionId}");
    }

    public function broadcastAs(): string
    {
        return 'lobby.room.closed';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'gameSlug' => $this->gameSlug,
        ];
    }
}
