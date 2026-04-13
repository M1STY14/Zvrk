<?php

namespace Tests\Unit\Events;

use App\Events\PlayerJoinedLobby;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Tests\TestCase;

class PlayerJoinedLobbyTest extends TestCase
{
    public function test_it_implements_should_broadcast(): void
    {
        $event = new PlayerJoinedLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $this->assertInstanceOf(ShouldBroadcast::class, $event);
    }

    public function test_it_broadcasts_on_lobby_presence_channel(): void
    {
        $event = new PlayerJoinedLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $channel = $event->broadcastOn();

        $this->assertInstanceOf(PresenceChannel::class, $channel);
        $this->assertSame('presence-lobby.tic-tac-toe', $channel->name);
    }

    public function test_it_broadcasts_as_player_joined_lobby(): void
    {
        $event = new PlayerJoinedLobby(
            gameSlug: 'tic-tac-toe',
            playerId: 'player-1',
            playerName: 'Alice',
        );

        $this->assertSame('player.joined.lobby', $event->broadcastAs());
    }

    public function test_it_broadcasts_correct_payload(): void
    {
        $event = new PlayerJoinedLobby(
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
