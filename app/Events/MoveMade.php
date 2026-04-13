<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MoveMade implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $playerId,
        public int $row,
        public int $column,
        public array $board,
        public ?string $nextPlayerId = null,
        public ?string $winner = null,
        public bool $draw = false,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return [
            new PresenceChannel("game.{$this->sessionId}"),
        ];
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
            'row' => $this->row,
            'column' => $this->column,
            'board' => $this->board,
            'nextPlayerId' => $this->nextPlayerId,
            'winner' => $this->winner,
            'draw' => $this->draw,
        ];
    }
}