<?php

namespace Tests\Unit\Events;

use App\Events\ChatMessageSent;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class ChatMessageSentTest extends TestCase
{
    public function test_it_implements_should_broadcast(): void
    {
        $event = new ChatMessageSent(
            sessionId: 'session-1',
            message: 'Hello!',
            senderId: 'player-1',
            senderName: 'Alice',
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_game_chat_private_channel(): void
    {
        $event = new ChatMessageSent(
            sessionId: 'session-1',
            message: 'Hello!',
            senderId: 'player-1',
            senderName: 'Alice',
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('private-game.session-1.chat', $channel->name);
    }

    public function test_it_broadcasts_as_chat_message_sent(): void
    {
        $event = new ChatMessageSent(
            sessionId: 'session-1',
            message: 'Hello!',
            senderId: 'player-1',
            senderName: 'Alice',
        );

        $this->assertSame('chat.message.sent', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $event = new ChatMessageSent(
            sessionId: 'session-1',
            message: 'Hello!',
            senderId: 'player-1',
            senderName: 'Alice',
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'message' => 'Hello!',
            'sender' => [
                'id' => 'player-1',
                'name' => 'Alice',
            ],
        ], $event->broadcastWith());
    }
}
