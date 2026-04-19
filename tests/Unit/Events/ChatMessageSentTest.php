<?php

namespace Tests\Unit\Events;

use App\Events\ChatMessageSent;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class ChatMessageSentTest extends TestCase
{
    private function makeEvent(): ChatMessageSent
    {
        return new ChatMessageSent(
            sessionId: 'session-1',
            messageId: 'message-1',
            message: 'Hello!',
            senderId: 'player-1',
            senderName: 'Alice',
            createdAt: '2026-04-19T12:00:00.000000Z',
        );
    }

    public function test_it_implements_should_broadcast(): void
    {
        $this->assertInstanceOf(ShouldBroadcast::class, $this->makeEvent());
    }

    public function test_it_broadcasts_on_game_chat_private_channel(): void
    {
        $channel = $this->makeEvent()->broadcastOn();

        $this->assertInstanceOf(PrivateChannel::class, $channel);
        $this->assertSame('private-game.session-1.chat', $channel->name);
    }

    public function test_it_broadcasts_as_chat_message_sent(): void
    {
        $this->assertSame('chat.message.sent', $this->makeEvent()->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $this->assertSame([
            'id' => 'message-1',
            'sessionId' => 'session-1',
            'message' => 'Hello!',
            'sender' => [
                'id' => 'player-1',
                'name' => 'Alice',
            ],
            'created_at' => '2026-04-19T12:00:00.000000Z',
        ], $this->makeEvent()->broadcastWith());
    }
}
