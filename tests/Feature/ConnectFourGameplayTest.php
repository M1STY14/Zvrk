<?php

namespace Tests\Feature;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConnectFourGameplayTest extends TestCase
{
    use RefreshDatabase;

    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        $this->game = Game::factory()->create([
            'slug' => 'four-in-a-row',
            'name' => '4 in a Row',
            'min_players' => 2,
            'max_players' => 2,
            'is_active' => true,
        ]);
    }

    private function createPlayingSession(): array
    {
        $host = User::factory()->create();
        $guest = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $host->id,
            'status' => GameStatus::Pending,
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

        app(GameSessionService::class)->startGame($session->fresh()->load('game'));

        return [$session->fresh()->load('game'), $host, $guest];
    }

    public function test_connect_four_session_starts_with_six_by_seven_board(): void
    {
        [$session] = $this->createPlayingSession();

        $this->assertCount(6, $session->state['board']);
        $this->assertCount(7, $session->state['board'][0]);
        $this->assertSame(1, $session->state['currentTurn']);
    }

    public function test_move_endpoint_rejects_invalid_turn_for_connect_four(): void
    {
        [$session, $host, $guest] = $this->createPlayingSession();

        $response = $this->actingAs($guest)->postJson(route('game.move', $session), [
            'move_data' => ['col' => 0],
        ]);

        $response->assertStatus(422);
    }

    public function test_move_endpoint_rejects_full_column_for_connect_four(): void
    {
        [$session, $host, $guest] = $this->createPlayingSession();
        $service = app(GameSessionService::class);

        $service->applyMove($session, $host, ['col' => 0]);
        $session = $session->fresh()->load('game');
        $service->applyMove($session, $guest, ['col' => 0]);
        $session = $session->fresh()->load('game');
        $service->applyMove($session, $host, ['col' => 0]);
        $session = $session->fresh()->load('game');
        $service->applyMove($session, $guest, ['col' => 0]);
        $session = $session->fresh()->load('game');
        $service->applyMove($session, $host, ['col' => 0]);
        $session = $session->fresh()->load('game');
        $service->applyMove($session, $guest, ['col' => 0]);
        $session = $session->fresh()->load('game');

        $response = $this->actingAs($host)->postJson(route('game.move', $session), [
            'move_data' => ['col' => 0],
        ]);

        $response->assertStatus(422);
    }
}

