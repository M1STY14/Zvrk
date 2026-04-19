<?php

namespace Tests\Feature;

use App\Events\GameEnded;
use App\Listeners\UpdatePlayerStats;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UpdatePlayerStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_winning_game_increments_winner_and_loser_stats(): void
    {
        $game = Game::factory()->create();
        $winner = User::factory()->create();
        $loser = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $winner->id,
            'winner_user_id' => $winner->id,
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $winner->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $loser->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        (new UpdatePlayerStats())->handle(new GameEnded(
            sessionId: $session->id,
            winner: $winner->id,
            draw: false,
            board: [],
        ));

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $winner->id,
            'game_id' => $game->id,
            'games_played' => 1,
            'wins' => 1,
            'losses' => 0,
            'draws' => 0,
        ]);

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $loser->id,
            'game_id' => $game->id,
            'games_played' => 1,
            'wins' => 0,
            'losses' => 1,
            'draws' => 0,
        ]);
    }

    public function test_draw_increments_draws_and_games_played_for_all_players(): void
    {
        $game = Game::factory()->create();
        $playerOne = User::factory()->create();
        $playerTwo = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $playerOne->id,
            'winner_user_id' => null,
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $playerOne->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $playerTwo->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        (new UpdatePlayerStats())->handle(new GameEnded(
            sessionId: $session->id,
            winner: null,
            draw: true,
            board: [],
        ));

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $playerOne->id,
            'game_id' => $game->id,
            'games_played' => 1,
            'wins' => 0,
            'losses' => 0,
            'draws' => 1,
        ]);

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $playerTwo->id,
            'game_id' => $game->id,
            'games_played' => 1,
            'wins' => 0,
            'losses' => 0,
            'draws' => 1,
        ]);
    }

    public function test_first_game_creates_player_stat_records(): void
    {
        $game = Game::factory()->create();
        $winner = User::factory()->create();
        $loser = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $winner->id,
            'winner_user_id' => $winner->id,
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $winner->id,
            'player_number' => 1,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $loser->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $this->assertDatabaseEmpty('player_stats');

        (new UpdatePlayerStats())->handle(new GameEnded(
            sessionId: $session->id,
            winner: $winner->id,
            draw: false,
            board: [],
        ));

        $this->assertDatabaseCount('player_stats', 2);
    }

    public function test_multiple_games_accumulate_stats_correctly(): void
    {
        $game = Game::factory()->create();
        $winner = User::factory()->create();
        $loser = User::factory()->create();

        $listener = new UpdatePlayerStats();

        foreach ([1, 2] as $_) {
            $session = GameSession::factory()->create([
                'game_id' => $game->id,
                'host_user_id' => $winner->id,
                'winner_user_id' => $winner->id,
            ]);

            GamePlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $winner->id,
                'player_number' => 1,
                'is_connected' => true,
                'joined_at' => now(),
            ]);

            GamePlayer::query()->create([
                'game_session_id' => $session->id,
                'user_id' => $loser->id,
                'player_number' => 2,
                'is_connected' => true,
                'joined_at' => now(),
            ]);

            $listener->handle(new GameEnded(
                sessionId: $session->id,
                winner: $winner->id,
                draw: false,
                board: [],
            ));
        }

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $winner->id,
            'game_id' => $game->id,
            'games_played' => 2,
            'wins' => 2,
            'losses' => 0,
            'draws' => 0,
        ]);

        $this->assertDatabaseHas('player_stats', [
            'user_id' => $loser->id,
            'game_id' => $game->id,
            'games_played' => 2,
            'wins' => 0,
            'losses' => 2,
            'draws' => 0,
        ]);
    }
}
