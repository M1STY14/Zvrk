<?php

namespace Tests\Unit\Events;

use App\Data\TicTacToeState;
use App\Events\GameEnded;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Support\Collection;
use Tests\TestCase;

class GameEndedTest extends TestCase
{
    private function makeState(array $board = [[1, 1, 1], [2, 2, 0], [0, 0, 0]]): TicTacToeState
    {
        return new TicTacToeState(
            board: $board,
            currentTurn: 1,
            players: new Collection(['1' => 'player-1', '2' => 'player-2']),
        );
    }

    public function test_it_implements_should_broadcast(): void
    {
        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            state: $this->makeState(),
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_game_presence_channel(): void
    {
        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            state: $this->makeState(),
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
            state: $this->makeState(),
        );

        $this->assertSame('game.ended', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload_with_winner(): void
    {
        $state = $this->makeState();

        $event = new GameEnded(
            sessionId: 'session-1',
            winner: 'player-1',
            draw: false,
            state: $state,
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'winner' => 'player-1',
            'draw' => false,
            'state' => $state->toArray(),
        ], $event->broadcastWith());
    }

    public function test_it_broadcasts_correct_payload_on_draw(): void
    {
        $state = $this->makeState([[1, 2, 1], [1, 2, 2], [2, 1, 1]]);

        $event = new GameEnded(
            sessionId: 'session-1',
            winner: null,
            draw: true,
            state: $state,
        );

        $this->assertSame([
            'sessionId' => 'session-1',
            'winner' => null,
            'draw' => true,
            'state' => $state->toArray(),
        ], $event->broadcastWith());
    }
}
