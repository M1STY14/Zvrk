<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class QuickMatchTest extends TestCase
{
    use RefreshDatabase;

    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        $this->game = Game::factory()->create([
            'slug' => 'tic-tac-toe',
            'min_players' => 2,
            'max_players' => 2,
            'is_active' => true,
        ]);
    }

    public function test_quick_match_joins_existing_waiting_room(): void
    {
        $host = User::factory()->create();
        $joiner = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
            'max_players' => 2,
            'is_private' => false,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $this->actingAs($joiner)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect(route('game.show', $session->id));

        $this->assertDatabaseCount('game_sessions', 1);
        $this->assertEquals(2, $session->fresh()->players()->count());
        $this->assertTrue($session->fresh()->status->is(GameStatus::Playing));
    }

    public function test_quick_match_creates_room_when_none_available(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect();

        $session = GameSession::query()->first();

        $this->assertNotNull($session);
        $this->assertSame('Quick Match', $session->name);
        $this->assertTrue($session->status->is(GameStatus::Pending));
        $this->assertEquals(1, $session->players()->count());
        $this->assertSame($user->id, $session->host_user_id);
        $this->assertSame($this->game->max_players, $session->max_players);
    }

    public function test_quick_match_does_not_start_until_room_is_full(): void
    {
        $ludo = Game::factory()->create([
            'slug' => 'ludo',
            'min_players' => 2,
            'max_players' => 4,
            'is_active' => true,
        ]);

        $users = User::factory()->count(3)->create();

        foreach ($users as $user) {
            $this->actingAs($user)
                ->post(route('lobby.quick-match', $ludo->slug))
                ->assertRedirect(route('lobby.show', [$ludo->slug, GameSession::query()->value('id')]));
        }

        $session = GameSession::query()->first();

        $this->assertTrue($session->status->is(GameStatus::Pending));
        $this->assertEquals(3, $session->players()->count());
        $this->assertSame(4, $session->max_players);
    }

    public function test_two_players_quick_matching_are_matched_together(): void
    {
        $first = User::factory()->create();
        $second = User::factory()->create();

        $this->actingAs($first)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect();

        $this->actingAs($second)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect(route('game.show', GameSession::query()->value('id')));

        $this->assertDatabaseCount('game_sessions', 1);
        $this->assertEquals(2, GameSession::query()->first()->players()->count());
    }

    public function test_game_auto_starts_when_room_fills(): void
    {
        $host = User::factory()->create();
        $joiner = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
            'max_players' => 2,
            'is_private' => false,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $this->actingAs($joiner)
            ->post(route('lobby.quick-match', $this->game->slug));

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Playing));
        $this->assertNotNull($session->started_at);
        $this->assertNotNull($session->state);
    }

    public function test_user_already_in_room_is_redirected_without_duplicate_join(): void
    {
        $user = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $user->id,
            'status' => GameStatus::Pending,
            'max_players' => 2,
        ]);

        $session->players()->create([
            'user_id' => $user->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $this->actingAs($user)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect(route('lobby.show', [$this->game->slug, $session->id]));

        $this->assertEquals(1, $session->fresh()->players()->count());
    }

    public function test_private_rooms_are_not_used_for_quick_match(): void
    {
        $host = User::factory()->create();
        $joiner = User::factory()->create();

        $privateSession = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
            'max_players' => 2,
            'is_private' => true,
        ]);

        $privateSession->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $this->actingAs($joiner)
            ->post(route('lobby.quick-match', $this->game->slug))
            ->assertRedirect();

        $this->assertDatabaseCount('game_sessions', 2);
        $this->assertNotSame($privateSession->id, GameSession::query()->where('name', 'Quick Match')->value('id'));
    }

    public function test_ludo_quick_match_starts_when_fourth_player_joins(): void
    {
        $ludo = Game::factory()->create([
            'slug' => 'ludo',
            'min_players' => 2,
            'max_players' => 4,
            'is_active' => true,
        ]);

        $users = User::factory()->count(4)->create();

        foreach ($users->take(3) as $user) {
            $this->actingAs($user)->post(route('lobby.quick-match', $ludo->slug));
        }

        $session = GameSession::query()->first();
        $this->assertTrue($session->status->is(GameStatus::Pending));

        $this->actingAs($users[3])
            ->post(route('lobby.quick-match', $ludo->slug))
            ->assertRedirect(route('game.show', $session->id));

        $this->assertTrue($session->fresh()->status->is(GameStatus::Playing));
        $this->assertEquals(4, $session->fresh()->players()->count());
    }
}
