<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class GameEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public ?string $winner,
        public bool $draw,
        public array $board,
    ) {
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
            'board' => $this->board,
        ];
    }
}
