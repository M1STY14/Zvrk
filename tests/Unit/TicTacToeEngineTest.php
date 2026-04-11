<?php

namespace Tests\Unit;

use App\Data\TicTacToeState;
use App\Data\TicTacToeMoveData;
use App\Games\TicTacToeEngine;
use Tests\TestCase;

class TicTacToeEngineTest extends TestCase
{
    public function test_get_current_turn_returns_current_turn_from_state(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            currentTurn: 1,
        );

        $currentTurn = $engine->getCurrentTurn($state);

        $this->assertSame(1, $currentTurn);
    }

    public function test_validate_move_rejects_out_of_bounds_move(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(
            row: 3,
            col: 0,
        );

        $isValid = $engine->validateMove($state, 1, $move);

        $this->assertFalse($isValid);
    }

    public function test_validate_move_rejects_wrong_players_turn(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(
            row: 0,
            col: 0,
        );

        $isValid = $engine->validateMove($state, 2, $move);

        $this->assertFalse($isValid);
    }

    public function test_apply_move_places_mark_and_switches_turn(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
            ],
            currentTurn: 1,
        );

        $move = new TicTacToeMoveData(
            row: 1,
            col: 1,
        );

        $newState = $engine->applyMove($state, 1, $move);

        $this->assertSame(1, $newState->board[1][1]);
        $this->assertSame(2, $newState->currentTurn);
    }

    public function test_player_one_wins_by_row(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 1, 1],
                [0, 2, 0],
                [2, 0, 0],
            ],
            currentTurn: 2,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(1, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_column(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 2, 0],
                [1, 2, 0],
                [1, 0, 0],
            ],
            currentTurn: 2,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(1, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_diagonal_1(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 2, 0],
                [0, 1, 2],
                [0, 0, 1],
            ],
            currentTurn: 2,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(1, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_one_wins_by_diagonal_2(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [0, 2, 1],
                [0, 1, 2],
                [1, 0, 0],
            ],
            currentTurn: 2,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(1, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_row(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [2, 2, 2],
                [1, 1, 0],
                [0, 0, 0],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(2, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_column(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 2, 0],
                [1, 2, 0],
                [0, 2, 1],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(2, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_main_diagonal(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [2, 1, 0],
                [0, 2, 1],
                [1, 0, 2],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(2, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_player_two_wins_by_anti_diagonal(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 0, 2],
                [0, 2, 1],
                [2, 1, 0],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(2, $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_draw_is_detected_when_board_is_full_and_there_is_no_winner(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 2, 1],
                [1, 2, 2],
                [2, 1, 1],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertNull($result->winner);
        $this->assertTrue($result->draw);
    }

    public function test_check_game_over_returns_null_when_game_is_still_ongoing(): void
    {
        $engine = new TicTacToeEngine();

        $state = new TicTacToeState(
            board: [
                [1, 2, 0],
                [0, 1, 0],
                [0, 0, 2],
            ],
            currentTurn: 1,
        );

        $result = $engine->checkGameOver($state);

        $this->assertNull($result);
    }

    public function test_full_game_flow_from_start_to_finish(): void
    {
        $engine = new TicTacToeEngine();

        $state = $engine->initialState(collect());

        $move1 = new TicTacToeMoveData(row: 0, col: 0);
        $this->assertTrue($engine->validateMove($state, 1, $move1));
        $state = $engine->applyMove($state, 1, $move1);

        $move2 = new TicTacToeMoveData(row: 1, col: 0);
        $this->assertTrue($engine->validateMove($state, 2, $move2));
        $state = $engine->applyMove($state, 2, $move2);

        $move3 = new TicTacToeMoveData(row: 0, col: 1);
        $this->assertTrue($engine->validateMove($state, 1, $move3));
        $state = $engine->applyMove($state, 1, $move3);

        $move4 = new TicTacToeMoveData(row: 1, col: 1);
        $this->assertTrue($engine->validateMove($state, 2, $move4));
        $state = $engine->applyMove($state, 2, $move4);

        $move5 = new TicTacToeMoveData(row: 0, col: 2);
        $this->assertTrue($engine->validateMove($state, 1, $move5));
        $state = $engine->applyMove($state, 1, $move5);

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame(1, $result->winner);
        $this->assertFalse($result->draw);
    }
}