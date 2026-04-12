<?php

namespace Tests\Unit;

use App\Data\GameState;
use App\Data\MoveData;
use App\Data\TicTacToeState;
use App\Data\TicTacToeMoveData;
use App\Games\TicTacToeEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Tests\TestCase;

class TicTacToeEngineTest extends TestCase
{
    use RefreshDatabase;

    private TicTacToeEngine $engine;
    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new TicTacToeEngine();
        $this->players = collect([
            1 => User::factory()->create()->id,
            2 => User::factory()->create()->id,
        ]);
    }

    private function makeState(array $board, int $currentTurn): TicTacToeState
    {
        return new TicTacToeState(
            board: $board,
            currentTurn: $currentTurn,
            players: $this->players,
        );
    }

    public function test_initial_state_throws_exception_when_less_than_two_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect([User::factory()->create()->id]));
    }

    public function test_initial_state_returns_empty_board_with_player_one_turn(): void
    {
        $state = $this->engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
        ]));

        $this->assertSame([[0, 0, 0], [0, 0, 0], [0, 0, 0]], $state->board);
        $this->assertSame(1, $state->currentTurn);
        $this->assertSame($this->players->get(1), $state->players->get(1));
        $this->assertSame($this->players->get(2), $state->players->get(2));
    }

    public function test_get_current_turn_returns_current_turn_from_state(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $this->assertSame(1, $this->engine->getCurrentTurn($state));
    }

    public function test_validate_move_rejects_out_of_bounds_move(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(row: 3, col: 0);

        $this->assertFalse($this->engine->validateMove($state, 1, $move));
    }

    public function test_validate_move_rejects_wrong_players_turn(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(row: 0, col: 0);

        $this->assertFalse($this->engine->validateMove($state, 2, $move));
    }

    public function test_validate_move_rejects_occupied_cell(): void
    {
        $state = $this->makeState(
            board: [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 2,
        );

        $move = new TicTacToeMoveData(row: 0, col: 0);

        $this->assertFalse($this->engine->validateMove($state, 2, $move));
    }

    public function test_validate_move_accepts_valid_move(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(row: 0, col: 0);

        $this->assertTrue($this->engine->validateMove($state, 1, $move));
    }

    public function test_apply_move_places_mark_and_switches_turn(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(row: 1, col: 1);
        $newState = $this->engine->applyMove($state, 1, $move);

        $this->assertSame(1, $newState->board[1][1]);
        $this->assertSame(2, $newState->currentTurn);
    }

    public function test_player_one_wins_by_row(): void
    {
        $state = $this->makeState(
            board: [[1, 1, 1], [0, 2, 0], [2, 0, 0]],
            currentTurn: 2,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_column(): void
    {
        $state = $this->makeState(
            board: [[1, 2, 0], [1, 2, 0], [1, 0, 0]],
            currentTurn: 2,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_diagonal_1(): void
    {
        $state = $this->makeState(
            board: [[1, 2, 0], [0, 1, 2], [0, 0, 1]],
            currentTurn: 2,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_diagonal_2(): void
    {
        $state = $this->makeState(
            board: [[0, 2, 1], [0, 1, 2], [1, 0, 0]],
            currentTurn: 2,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_row(): void
    {
        $state = $this->makeState(
            board: [[2, 2, 2], [1, 1, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(2), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_column(): void
    {
        $state = $this->makeState(
            board: [[1, 2, 0], [1, 2, 0], [0, 2, 1]],
            currentTurn: 1,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(2), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_main_diagonal(): void
    {
        $state = $this->makeState(
            board: [[2, 1, 0], [0, 2, 1], [1, 0, 2]],
            currentTurn: 1,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(2), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_anti_diagonal(): void
    {
        $state = $this->makeState(
            board: [[1, 0, 2], [0, 2, 1], [2, 1, 0]],
            currentTurn: 1,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(2), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_draw_is_detected_when_board_is_full_and_there_is_no_winner(): void
    {
        $state = $this->makeState(
            board: [[1, 2, 1], [1, 2, 2], [2, 1, 1]],
            currentTurn: 1,
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertNull($result->winner);
        $this->assertTrue($result->draw);
    }

    public function test_check_game_over_returns_null_when_game_is_still_ongoing(): void
    {
        $state = $this->makeState(
            board: [[1, 2, 0], [0, 1, 0], [0, 0, 2]],
            currentTurn: 1,
        );

        $this->assertNull($this->engine->checkGameOver($state));
    }

    public function test_apply_move_does_not_mutate_original_state(): void
    {
        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(row: 1, col: 1);
        $this->engine->applyMove($state, 1, $move);

        $this->assertSame(0, $state->board[1][1]);
        $this->assertSame(1, $state->currentTurn);
    }

    public function test_validate_move_throws_exception_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $fakeState = new class extends GameState {};
        $move = new TicTacToeMoveData(row: 0, col: 0);

        $this->engine->validateMove($fakeState, 1, $move);
    }

    public function test_validate_move_throws_exception_for_wrong_move_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $state = $this->makeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
        );
        $fakeMove = new class extends MoveData {};

        $this->engine->validateMove($state, 1, $fakeMove);
    }

    public function test_apply_move_throws_exception_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $fakeState = new class extends GameState {};
        $move = new TicTacToeMoveData(row: 0, col: 0);

        $this->engine->applyMove($fakeState, 1, $move);
    }

    public function test_check_game_over_throws_exception_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $fakeState = new class extends GameState {};

        $this->engine->checkGameOver($fakeState);
    }

    public function test_get_current_turn_throws_exception_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $fakeState = new class extends GameState {};

        $this->engine->getCurrentTurn($fakeState);
    }

    public function test_full_game_flow_from_start_to_finish(): void
    {
        $state = $this->engine->initialState(collect([
            User::factory()->create()->id,
            User::factory()->create()->id,
        ]));

        $moves = [
            [1, 0, 0],
            [2, 1, 0],
            [1, 0, 1],
            [2, 1, 1],
            [1, 0, 2],
        ];

        foreach ($moves as [$player, $row, $col]) {
            $move = new TicTacToeMoveData(row: $row, col: $col);
            $this->assertTrue($this->engine->validateMove($state, $player, $move));
            $state = $this->engine->applyMove($state, $player, $move);
        }

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($state->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }
}