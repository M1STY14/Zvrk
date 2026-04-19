<?php

namespace Tests\Feature\Services;

use App\Enums\GameStatus;
use App\Events\GameEnded;
use App\Events\GameStarted;
use App\Events\MoveMade;
use App\Events\PlayerJoinedLobby;
use App\Events\PlayerLeftLobby;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class GameSessionServiceTest extends TestCase
{
    use RefreshDatabase;

    private GameSessionService $service;
    private Game $game;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(GameSessionService::class);
        $this->game = Game::factory()->create();
    }

    private function createSessionWithHost(): array
    {
        $host = User::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $this->game->id,
            'host_user_id' => $host->id,
        ]);

        $session->players()->create([
            'user_id' => $host->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        $session->load('game');

        return [$session, $host];
    }

    private function createTwoPlayerSession(): array
    {
        [$session, $host] = $this->createSessionWithHost();

        $player2 = User::factory()->create();

        $session->players()->create([
            'user_id' => $player2->id,
            'player_number' => 2,
            'joined_at' => now(),
        ]);

        return [$session, $host, $player2];
    }

    private function beginGame(GameSession $session): void
    {
        Event::fake();
        $this->service->startGame($session);
        $session->refresh();
        $session->load('game');
    }

    public function test_add_player_creates_game_player_record(): void
    {
        Event::fake();

        [$session, $host] = $this->createSessionWithHost();
        $player2 = User::factory()->create();

        $this->service->addPlayer($session, $player2);

        $this->assertDatabaseHas('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $player2->id,
        ]);
    }

    public function test_add_player_assigns_next_player_number(): void
    {
        Event::fake();

        [$session, $host] = $this->createSessionWithHost();
        $player2 = User::factory()->create();

        $this->service->addPlayer($session, $player2);

        $this->assertDatabaseHas('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $player2->id,
            'player_number' => 2,
        ]);
    }

    public function test_add_player_dispatches_player_joined_lobby_event(): void
    {
        Event::fake([PlayerJoinedLobby::class]);

        [$session, $host] = $this->createSessionWithHost();
        $player2 = User::factory()->create();

        $this->service->addPlayer($session, $player2);

        Event::assertDispatched(PlayerJoinedLobby::class, function ($event) use ($player2) {
            return $event->playerId === $player2->id
                && $event->gameSlug === 'tic-tac-toe';
        });
    }

    public function test_start_game_sets_status_to_playing(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Playing));
    }

    public function test_start_game_initializes_board_state(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);

        $session->refresh();

        $this->assertNotNull($session->state);
        $this->assertSame([[0, 0, 0], [0, 0, 0], [0, 0, 0]], $session->state['board']);
    }

    public function test_start_game_sets_started_at_timestamp(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);

        $session->refresh();

        $this->assertNotNull($session->started_at);
    }

    public function test_start_game_state_contains_player_mapping(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);

        $session->refresh();

        $this->assertSame($host->id, $session->state['players'][1]);
        $this->assertSame($player2->id, $session->state['players'][2]);
    }

    public function test_start_game_broadcasts_game_started_event(): void
    {
        Event::fake([GameStarted::class]);

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);

        Event::assertDispatched(GameStarted::class, function ($event) use ($session) {
            return $event->sessionId === $session->id;
        });
    }

    public function test_apply_move_updates_game_state(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);

        $session->refresh();

        $this->assertSame(1, $session->state['board'][0][0]);
        $this->assertSame(2, $session->state['currentTurn']);
    }

    public function test_apply_move_creates_move_record(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);

        $this->assertDatabaseHas('moves', [
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'move_number' => 1,
        ]);
    }

    public function test_apply_move_returns_state_and_move_number(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $result = $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);

        $this->assertArrayHasKey('state', $result);
        $this->assertArrayHasKey('move_number', $result);
        $this->assertSame(1, $result['move_number']);
        $this->assertFalse($result['game_over']);
    }

    public function test_apply_move_increments_move_number(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);
        $session->refresh()->load('game');

        $result = $this->service->applyMove($session, $player2, ['row' => 1, 'col' => 0]);

        $this->assertSame(2, $result['move_number']);
    }

    public function test_apply_move_throws_validation_exception_for_invalid_move(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->expectException(ValidationException::class);

        // Player 2 tries to move on player 1's turn
        $this->service->applyMove($session, $player2, ['row' => 0, 'col' => 0]);
    }

    public function test_apply_move_throws_validation_exception_for_occupied_cell(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);
        $session->refresh()->load('game');

        $this->expectException(ValidationException::class);

        // Player 2 tries to place on an occupied cell
        $this->service->applyMove($session, $player2, ['row' => 0, 'col' => 0]);
    }

    public function test_apply_move_detects_win_and_finishes_game(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        // Player 1 wins with top row: (0,0), (0,1), (0,2)
        $moves = [
            [$host, ['row' => 0, 'col' => 0]],
            [$player2, ['row' => 1, 'col' => 0]],
            [$host, ['row' => 0, 'col' => 1]],
            [$player2, ['row' => 1, 'col' => 1]],
            [$host, ['row' => 0, 'col' => 2]],  // winning move
        ];

        $result = null;
        foreach ($moves as [$player, $move]) {
            $result = $this->service->applyMove($session, $player, $move);
            $session->refresh()->load('game');
        }

        $this->assertTrue($result['game_over']);
        $this->assertSame($host->id, $result['result']['winner']);
        $this->assertFalse($result['result']['draw']);

        $session->refresh();
        $this->assertTrue($session->status->is(GameStatus::Finished));
        $this->assertSame($host->id, $session->winner_user_id);
        $this->assertNotNull($session->finished_at);
    }

    public function test_apply_move_detects_draw(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        // Play to a draw
        $moves = [
            [$host, ['row' => 0, 'col' => 0]],    // X
            [$player2, ['row' => 0, 'col' => 1]],  // O
            [$host, ['row' => 0, 'col' => 2]],     // X
            [$player2, ['row' => 1, 'col' => 1]],  // O
            [$host, ['row' => 1, 'col' => 0]],     // X
            [$player2, ['row' => 1, 'col' => 2]],  // O
            [$host, ['row' => 2, 'col' => 1]],     // X
            [$player2, ['row' => 2, 'col' => 0]],  // O
            [$host, ['row' => 2, 'col' => 2]],     // X — draw
        ];

        $result = null;
        foreach ($moves as [$player, $move]) {
            $result = $this->service->applyMove($session, $player, $move);
            $session->refresh()->load('game');
        }

        $this->assertTrue($result['game_over']);
        $this->assertNull($result['result']['winner']);
        $this->assertTrue($result['result']['draw']);
    }

    public function test_apply_move_broadcasts_move_made_event(): void
    {
        Event::fake([MoveMade::class]);

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        // Start without faking events
        $this->service->startGame($session);
        $session->refresh()->load('game');

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);

        Event::assertDispatched(MoveMade::class, function ($event) use ($session, $host) {
            return $event->sessionId === $session->id
                && $event->playerId === $host->id
                && $event->row === 0
                && $event->column === 0;
        });
    }

    public function test_apply_move_broadcasts_game_ended_on_win(): void
    {
        Event::fake([GameEnded::class]);

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);
        $session->refresh()->load('game');

        $moves = [
            [$host, ['row' => 0, 'col' => 0]],
            [$player2, ['row' => 1, 'col' => 0]],
            [$host, ['row' => 0, 'col' => 1]],
            [$player2, ['row' => 1, 'col' => 1]],
            [$host, ['row' => 0, 'col' => 2]],
        ];

        foreach ($moves as [$player, $move]) {
            $this->service->applyMove($session, $player, $move);
            $session->refresh()->load('game');
        }

        Event::assertDispatched(GameEnded::class, function ($event) use ($session, $host) {
            return $event->sessionId === $session->id
                && $event->winner === $host->id
                && $event->draw === false;
        });
    }

    public function test_apply_move_saves_move_history(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->applyMove($session, $host, ['row' => 0, 'col' => 0]);
        $session->refresh()->load('game');
        $this->service->applyMove($session, $player2, ['row' => 1, 'col' => 1]);

        $this->assertCount(2, $session->moves);

        $firstMove = $session->moves()->where('move_number', 1)->first();
        $this->assertSame($host->id, $firstMove->user_id);
        $this->assertEquals(['row' => 0, 'col' => 0], $firstMove->move_data);

        $secondMove = $session->moves()->where('move_number', 2)->first();
        $this->assertSame($player2->id, $secondMove->user_id);
        $this->assertEquals(['row' => 1, 'col' => 1], $secondMove->move_data);
    }

    public function test_remove_player_from_pending_session_deletes_player(): void
    {
        Event::fake();

        [$session, $host] = $this->createSessionWithHost();
        $player2 = User::factory()->create();

        $session->players()->create([
            'user_id' => $player2->id,
            'player_number' => 2,
            'joined_at' => now(),
        ]);

        $this->service->removePlayer($session, $player2);

        $this->assertDatabaseMissing('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $player2->id,
        ]);

        // Session should still be pending (non-host left)
        $session->refresh();
        $this->assertTrue($session->status->is(GameStatus::Pending));
    }

    public function test_remove_host_from_pending_session_sets_abandoned(): void
    {
        Event::fake();

        [$session, $host] = $this->createSessionWithHost();

        $this->service->removePlayer($session, $host);

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Abandoned));
    }

    public function test_remove_player_from_pending_session_dispatches_player_left_lobby(): void
    {
        Event::fake([PlayerLeftLobby::class]);

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->removePlayer($session, $player2);

        Event::assertDispatched(PlayerLeftLobby::class, function ($event) use ($player2) {
            return $event->playerId === $player2->id
                && $event->gameSlug === 'tic-tac-toe';
        });
    }

    public function test_remove_player_from_playing_session_sets_abandoned(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->removePlayer($session, $player2);

        $session->refresh();

        $this->assertTrue($session->status->is(GameStatus::Abandoned));
        $this->assertNotNull($session->finished_at);
    }

    public function test_remove_player_from_playing_session_broadcasts_game_ended(): void
    {
        Event::fake([GameEnded::class]);

        [$session, $host, $player2] = $this->createTwoPlayerSession();

        $this->service->startGame($session);
        $session->refresh()->load('game');

        $this->service->removePlayer($session, $player2);

        Event::assertDispatched(GameEnded::class, function ($event) use ($session) {
            return $event->sessionId === $session->id
                && $event->winner === null
                && $event->draw === false;
        });
    }

    public function test_remove_player_from_playing_session_deletes_player_record(): void
    {
        Event::fake();

        [$session, $host, $player2] = $this->createTwoPlayerSession();
        $this->beginGame($session);

        $this->service->removePlayer($session, $player2);

        $this->assertDatabaseMissing('game_players', [
            'game_session_id' => $session->id,
            'user_id' => $player2->id,
        ]);
    }
}
