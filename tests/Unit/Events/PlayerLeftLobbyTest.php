<?php

namespace Tests\Unit\Events;

use App\Events\PlayerLeftLobby;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class PlayerLeftLobbyTest extends TestCase
{
    public function test_it_implements_should_broadcast(): void
    {
        $event = new PlayerLeftLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_lobby_presence_channel(): void
    {
        $event = new PlayerLeftLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PresenceChannel::class, $channel);
        $this->assertSame('presence-lobby.tic-tac-toe', $channel->name);
    }

    public function test_it_broadcasts_as_player_left_lobby(): void
    {
        $event = new PlayerLeftLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $this->assertSame('player.left.lobby', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $event = new PlayerLeftLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $this->assertSame([
            'gameSlug' => 'tic-tac-toe',
            'player' => [
                'id' => 'player-1',
                'name' => 'Alice',
            ],
        ], $event->broadcastWith());
    }
}
