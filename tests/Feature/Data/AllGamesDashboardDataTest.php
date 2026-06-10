<?php

namespace Tests\Feature\Data;

use App\Data\AllGamesDashboardData;
use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class AllGamesDashboardDataTest extends TestCase
{
    use RefreshDatabase;

    private function addPlayer(GameSession $session, int $number, bool $connected): void
    {
        $session->players()->create([
            'user_id' => User::factory()->create()->id,
            'player_number' => $number,
            'is_connected' => $connected,
            'joined_at' => now(),
        ]);
    }

    public function test_active_players_counts_only_connected_players(): void
    {
        $game = Game::factory()->create();
        $viewer = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'status' => GameStatus::Playing,
        ]);

        $this->addPlayer($session, 1, connected: true);
        $this->addPlayer($session, 2, connected: false);

        $data = AllGamesDashboardData::fromCustom($game, $viewer);

        // Only the connected player is "online" — the abandoned roster row is ignored.
        $this->assertSame(1, $data->active_players);
    }

    public function test_active_players_ignores_finished_sessions(): void
    {
        $game = Game::factory()->create();
        $viewer = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'status' => GameStatus::Finished,
        ]);
        $this->addPlayer($session, 1, connected: true);

        $data = AllGamesDashboardData::fromCustom($game, $viewer);

        $this->assertSame(0, $data->active_players);
    }
}
