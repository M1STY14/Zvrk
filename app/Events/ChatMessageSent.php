<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $message,
        public string $senderId,
        public string $senderName,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return [
            new PrivateChannel("game.{$this->sessionId}.chat"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'chat.message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'message' => $this->message,
            'sender' => [
                'id' => $this->senderId,
                'name' => $this->senderName,
            ],
        ];
    }
}