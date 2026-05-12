<?php

namespace App\Events;

use App\Data\GameState;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class MoveMade implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $sessionId;
    public string $playerId;
    public ?string $nextPlayerId;
    public array $state;

    public function __construct(string $sessionId, string $playerId, ?string $nextPlayerId, GameState $state)
    {
        $this->sessionId = $sessionId;
        $this->playerId = $playerId;
        $this->nextPlayerId = $nextPlayerId;
        $this->state = $state->toArray();
    }

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("game.{$this->sessionId}");
    }

    public function broadcastAs(): string
    {
        return 'move.made';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'playerId' => $this->playerId,
            'nextPlayerId' => $this->nextPlayerId,
            'state' => $this->state,
        ];
    }
}
