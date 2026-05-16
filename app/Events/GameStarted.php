<?php

namespace App\Events;

use App\Data\GameState;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class GameStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $sessionId;

    public string $startingPlayerId;

    public array $state;

    public function __construct(string $sessionId, string $startingPlayerId, GameState $state)
    {
        $this->sessionId = $sessionId;
        $this->startingPlayerId = $startingPlayerId;
        $this->state = $state->toArray();
    }

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("game.{$this->sessionId}");
    }

    public function broadcastAs(): string
    {
        return 'game.started';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'startingPlayerId' => $this->startingPlayerId,
            'state' => $this->state,
        ];
    }
}
