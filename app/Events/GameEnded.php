<?php

namespace App\Events;

use App\Data\GameState;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class GameEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $sessionId;
    public ?string $winner;
    public bool $draw;
    public array $state;

    public function __construct(string $sessionId, ?string $winner, bool $draw, GameState $state)
    {
        $this->sessionId = $sessionId;
        $this->winner = $winner;
        $this->draw = $draw;
        $this->state = $state->toArray();
    }

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("game.{$this->sessionId}");
    }

    public function broadcastAs(): string
    {
        return 'game.ended';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'winner' => $this->winner,
            'draw' => $this->draw,
            'state' => $this->state,
        ];
    }
}
