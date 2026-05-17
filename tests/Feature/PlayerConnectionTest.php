<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Events\GameEnded;
use App\Events\LobbyRoomClosed;
use App\Events\PlayerConnectionChanged;
use App\Events\PlayerLeftLobby;
use App\Jobs\ForfeitDisconnectedPlayerJob;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

final class PlayerConnectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_presence_disconnect_sets_is_connected_false(): void
    {
        $game = Game::factory()->create([
            'slug' => 'tic-tac-toe',
            'min_players' => 2,
            'max_players' => 2,
        ]);

        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'max_players' => 2,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertOk();

        $this->assertDatabaseHas('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $guest->id,
            'is_connected' => false,
        ]);

        $this->assertDatabaseHas('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'is_connected' => true,
        ]);
    }

    public function test_presence_disconnect_broadcasts_to_other_players(): void
    {
        Event::fake([PlayerConnectionChanged::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertOk();

        Event::assertDispatched(PlayerConnectionChanged::class, function (PlayerConnectionChanged $event) use ($session, $guest) {
            return $event->sessionId === $session->id
                && $event->userId === $guest->id
                && $event->isConnected === false;
        });
    }

    public function test_presence_connect_sets_is_connected_true(): void
    {
        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => false,
            'joined_at' => now(),
        ]);

        $this->actingAs($guest)
            ->post(route('game.presence.connect', [$session, $guest]))
            ->assertOk();

        $this->assertDatabaseHas('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $guest->id,
            'is_connected' => true,
        ]);
    }

    public function test_presence_connect_broadcasts_to_other_players(): void
    {
        Event::fake([PlayerConnectionChanged::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => false,
            'joined_at' => now(),
        ]);

        $this->actingAs($guest)
            ->post(route('game.presence.connect', [$session, $guest]))
            ->assertOk();

        Event::assertDispatched(PlayerConnectionChanged::class, function (PlayerConnectionChanged $event) use ($session, $guest) {
            return $event->sessionId === $session->id
                && $event->userId === $guest->id
                && $event->isConnected === true;
        });
    }

    public function test_disconnect_during_active_game_schedules_forfeit_job(): void
    {
        Queue::fake();

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'state' => ['board' => [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 'players' => ['1' => $host->id, '2' => $guest->id], 'currentTurn' => 1],
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertOk();

        Queue::assertPushed(ForfeitDisconnectedPlayerJob::class, function (ForfeitDisconnectedPlayerJob $job) use ($session, $guest) {
            return $job->gameSessionId === $session->id && $job->userId === $guest->id;
        });
    }

    public function test_disconnect_in_pending_lobby_does_not_schedule_forfeit_job(): void
    {
        Queue::fake();

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertOk();

        Queue::assertNotPushed(ForfeitDisconnectedPlayerJob::class);
    }

    public function test_reconnect_before_sixty_seconds_prevents_forfeit(): void
    {
        Event::fake([GameEnded::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'state' => ['board' => [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 'players' => ['1' => $host->id, '2' => $guest->id], 'currentTurn' => 1],
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $guestPlayer = $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        app(GameSessionService::class)->markPlayerDisconnected($session, $guest);

        $guestPlayer->update(['disconnected_at' => now()->subSeconds(30)]);

        app(GameSessionService::class)->forfeitDueToDisconnect($session->fresh(), $guest);

        $this->assertTrue($session->fresh()->status->is(GameStatus::Playing));
        Event::assertNotDispatched(GameEnded::class);
    }

    public function test_forfeit_after_sixty_seconds_abandons_game_and_sets_winner(): void
    {
        Event::fake([GameEnded::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'state' => ['board' => [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 'players' => ['1' => $host->id, '2' => $guest->id], 'currentTurn' => 1],
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $guestPlayer = $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => false,
            'disconnected_at' => now()->subSeconds(61),
            'joined_at' => now(),
        ]);

        app(GameSessionService::class)->forfeitDueToDisconnect($session->fresh(), $guest);

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Abandoned));
        $this->assertSame($host->id, $session->winner_user_id);

        Event::assertDispatched(GameEnded::class, function (GameEnded $event) use ($session, $host) {
            return $event->sessionId === $session->id
                && $event->winner === $host->id
                && $event->reason === 'forfeit';
        });
    }

    public function test_stale_disconnection_command_forfeits_game(): void
    {
        Event::fake([GameEnded::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'state' => ['board' => [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 'players' => ['1' => $host->id, '2' => $guest->id], 'currentTurn' => 1],
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => false,
            'disconnected_at' => now()->subSeconds(90),
            'joined_at' => now(),
        ]);

        $this->artisan('game:process-disconnections')->assertSuccessful();

        $this->assertTrue($session->fresh()->status->is(GameStatus::Abandoned));
        $this->assertSame($host->id, $session->fresh()->winner_user_id);

        Event::assertDispatched(GameEnded::class);
    }

    public function test_host_disconnect_in_pending_lobby_abandons_room(): void
    {
        Event::fake([PlayerLeftLobby::class, LobbyRoomClosed::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $host]))
            ->assertOk();

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Abandoned));
        $this->assertDatabaseMissing('game_players', ['game_session_id' => $session->id]);

        Event::assertDispatched(PlayerLeftLobby::class);
        Event::assertDispatched(LobbyRoomClosed::class, function (LobbyRoomClosed $event) use ($session, $game) {
            return $event->sessionId === $session->id && $event->gameSlug === $game->slug;
        });
    }

    public function test_guest_disconnect_in_pending_lobby_does_not_close_room(): void
    {
        Event::fake([LobbyRoomClosed::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($host)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertOk();

        $this->assertTrue($session->fresh()->status->is(GameStatus::Pending));
        $this->assertEquals(2, $session->players()->count());
        Event::assertNotDispatched(LobbyRoomClosed::class);
    }

    public function test_stale_host_disconnect_command_closes_pending_lobby(): void
    {
        Event::fake([LobbyRoomClosed::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => false,
            'disconnected_at' => now()->subSeconds(90),
            'joined_at' => now(),
        ]);

        $this->artisan('game:process-disconnections')->assertSuccessful();

        $this->assertTrue($session->fresh()->status->is(GameStatus::Abandoned));
        Event::assertDispatched(LobbyRoomClosed::class);
    }

    public function test_manual_leave_during_active_game_forfeits_to_opponent(): void
    {
        Event::fake([GameEnded::class]);

        $game = Game::factory()->create();
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
            'state' => ['board' => [[0, 0, 0], [0, 0, 0], [0, 0, 0]], 'players' => ['1' => $host->id, '2' => $guest->id], 'currentTurn' => 1],
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->actingAs($guest)
            ->post(route('game.leave', $session))
            ->assertRedirect(route('lobby.index', $game->slug));

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Abandoned));
        $this->assertSame($host->id, $session->winner_user_id);

        Event::assertDispatched(GameEnded::class, function (GameEnded $event) use ($session, $host) {
            return $event->winner === $host->id && $event->reason === 'forfeit';
        });
    }

    public function test_non_player_cannot_report_disconnect(): void
    {
        $game = Game::factory()->create();
        $host = User::factory()->create();
        $outsider = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Playing,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $session->players()->create([
            'user_id' => $guest->id,
            'player_number' => 2,
            'joined_at' => now(),
        ]);

        $this->actingAs($outsider)
            ->post(route('game.presence.disconnect', [$session, $guest]))
            ->assertForbidden();
    }
}
