<?php

namespace Tests\Unit\Events;

use App\Events\GameEnded;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class GameEndedTest extends TestCase
{
    public function test_it_implements_should_broadcast(): void
    {
        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            board: [[1, 1, 1], [2, 2, 0], [0, 0, 0]],
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_game_presence_channel(): void
    {
        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            board: [[1, 1, 1], [2, 2, 0], [0, 0, 0]],
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PresenceChannel::class, $channel);
        $this->assertSame('presence-game.session-1', $channel->name);
    }

    public function test_it_broadcasts_as_game_ended(): void
    {
        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            board: [[1, 1, 1], [2, 2, 0], [0, 0, 0]],
        );

        $this->assertSame('game.ended', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload_with_winner(): void
    {
        $board = [[1, 1, 1], [2, 2, 0], [0, 0, 0]];

        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            board: $board,
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'winner' => 'player-1',
            'draw' => false,
            'board' => $board,
        ], $event->broadcastWith());
    }

    public function test_it_broadcasts_correct_payload_on_draw(): void
    {
        $board = [[1, 2, 1], [1, 2, 2], [2, 1, 1]];

        $event = new GameEnded(
            sessionId: 'session-1',
            winner: null,
            draw: true,
            board: $board,
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'winner' => null,
            'draw' => true,
            'board' => $board,
        ], $event->broadcastWith());
    }
}
