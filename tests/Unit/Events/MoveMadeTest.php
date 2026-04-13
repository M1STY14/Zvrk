<?php

namespace Tests\Unit\Events;

use App\Events\MoveMade;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class MoveMadeTest extends TestCase
{
    public function test_it_implements_should_broadcast(): void
    {
        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            row: 0,
            column: 1,
            board: [[0, 1, 0], [0, 0, 0], [0, 0, 0]],
            nextPlayerId: 'player-2',
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_game_presence_channel(): void
    {
        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            row: 0,
            column: 1,
            board: [[0, 1, 0], [0, 0, 0], [0, 0, 0]],
            nextPlayerId: 'player-2',
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PresenceChannel::class, $channel);
        $this->assertSame('presence-game.session-1', $channel->name);
    }

    public function test_it_broadcasts_as_move_made(): void
    {
        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            row: 0,
            column: 1,
            board: [[0, 1, 0], [0, 0, 0], [0, 0, 0]],
            nextPlayerId: 'player-2',
        );

        $this->assertSame('move.made', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $board = [[0, 1, 0], [0, 0, 0], [0, 0, 0]];

        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            row: 0,
            column: 1,
            board: $board,
            nextPlayerId: 'player-2',
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'playerId' => 'player-1',
            'row' => 0,
            'column' => 1,
            'board' => $board,
            'nextPlayerId' => 'player-2',
        ], $event->broadcastWith());
    }
}
