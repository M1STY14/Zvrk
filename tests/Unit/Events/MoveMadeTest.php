<?php

namespace Tests\Unit\Events;

use App\Data\TicTacToeState;
use App\Events\MoveMade;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Support\Collection;
use Tests\TestCase;

class MoveMadeTest extends TestCase
{
    private function makeState(): TicTacToeState
    {
        return new TicTacToeState(
            board: [[0, 1, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 2,
            players: new Collection(['1' => 'player-1', '2' => 'player-2']),
        );
    }

    public function test_it_implements_should_broadcast(): void
    {
        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            nextPlayerId: 'player-2',
            state: $this->makeState(),
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_game_presence_channel(): void
    {
        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            nextPlayerId: 'player-2',
            state: $this->makeState(),
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
            nextPlayerId: 'player-2',
            state: $this->makeState(),
        );

        $this->assertSame('move.made', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $state = $this->makeState();

        $event = new MoveMade(
            sessionId: 'session-1',
            playerId: 'player-1',
            nextPlayerId: 'player-2',
            state: $state,
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'playerId' => 'player-1',
            'nextPlayerId' => 'player-2',
            'state' => $state->toArray(),
        ], $event->broadcastWith());
    }
}
