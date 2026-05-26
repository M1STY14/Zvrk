<?php

namespace Tests\Unit;

use App\Data\CheckersMoveData;
use App\Data\CheckersState;
use App\Data\TicTacToeMoveData;
use App\Data\TicTacToeState;
use App\Games\Checkers\CheckersEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Tests\TestCase;

class CheckersEngineTest extends TestCase
{
    use RefreshDatabase;

    private CheckersEngine $engine;

    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new CheckersEngine;
        $this->players = collect([
            1 => User::factory()->create()->id,
            2 => User::factory()->create()->id,
        ]);
    }

    private function emptyBoard(): array
    {
        return array_fill(0, 8, array_fill(0, 8, 0));
    }

    private function makeState(array $board, int $currentTurn): CheckersState
    {
        return new CheckersState(
            board: $board,
            currentTurn: $currentTurn,
            players: $this->players,
        );
    }

    private function move(int $fr, int $fc, array $path): CheckersMoveData
    {
        $structured = array_map(
            fn (array $step) => ['row' => $step[0], 'col' => $step[1]],
            $path,
        );

        return new CheckersMoveData(
            from: ['row' => $fr, 'col' => $fc],
            path: $structured,
        );
    }

    // -------- Initial state --------

    public function test_initial_state_throws_when_less_than_two_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect([User::factory()->create()->id]));
    }

    public function test_initial_state_returns_correct_starting_board(): void
    {
        $state = $this->engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
        ]));

        $this->assertInstanceOf(CheckersState::class, $state);
        $this->assertSame(1, $state->currentTurn);

        for ($r = 0; $r < 8; $r++) {
            for ($c = 0; $c < 8; $c++) {
                $expected = 0;
                if ($r < 3 && ($r + $c) % 2 === 1) {
                    $expected = 2;
                } elseif ($r > 4 && ($r + $c) % 2 === 1) {
                    $expected = 1;
                }
                $this->assertSame($expected, $state->board[$r][$c], "Mismatch at ({$r},{$c})");
            }
        }
    }

    public function test_get_current_turn_returns_state_turn(): void
    {
        $state = $this->makeState($this->emptyBoard(), 2);
        $this->assertSame(2, $this->engine->getCurrentTurn($state));
    }

    // -------- Hydration --------

    public function test_make_state_hydrates_from_array(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;

        $state = $this->engine->makeState([
            'board' => $board,
            'currentTurn' => 2,
            'players' => [1 => 'a', 2 => 'b'],
        ]);

        $this->assertInstanceOf(CheckersState::class, $state);
        $this->assertSame(2, $state->currentTurn);
        $this->assertSame(1, $state->board[5][0]);
        $this->assertSame('a', $state->players->get(1));
        $this->assertSame('b', $state->players->get(2));
    }

    public function test_make_move_data_hydrates_from_array(): void
    {
        $moveData = $this->engine->makeMoveData([
            'from' => ['row' => 5, 'col' => 0],
            'path' => [['row' => 4, 'col' => 1]],
        ]);

        $this->assertInstanceOf(CheckersMoveData::class, $moveData);
        $this->assertSame(['row' => 5, 'col' => 0], $moveData->from);
        $this->assertSame([['row' => 4, 'col' => 1]], $moveData->path);
    }

    // -------- Simple moves --------

    public function test_player_one_can_move_diagonally_forward_one_square(): void
    {
        $board = $this->emptyBoard();
        $board[5][2] = 1;
        $state = $this->makeState($board, 1);

        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(5, 2, [[4, 1]])));
        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(5, 2, [[4, 3]])));

        $next = $this->engine->applyMove($state, 1, $this->move(5, 2, [[4, 3]]));
        $this->assertSame(0, $next->board[5][2]);
        $this->assertSame(1, $next->board[4][3]);
        $this->assertSame(2, $next->currentTurn);
    }

    public function test_player_two_can_move_diagonally_forward_one_square(): void
    {
        $board = $this->emptyBoard();
        $board[2][1] = 2;
        $state = $this->makeState($board, 2);

        $this->assertTrue($this->engine->validateMove($state, 2, $this->move(2, 1, [[3, 0]])));
        $this->assertTrue($this->engine->validateMove($state, 2, $this->move(2, 1, [[3, 2]])));
    }

    public function test_man_cannot_move_backward(): void
    {
        $board = $this->emptyBoard();
        $board[5][1] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 1, [[6, 0]])));
        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 1, [[6, 2]])));
    }

    public function test_man_cannot_move_to_occupied_square(): void
    {
        $board = $this->emptyBoard();
        $board[5][1] = 1;
        $board[4][2] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 1, [[4, 2]])));
    }

    public function test_cannot_move_when_not_your_turn(): void
    {
        $board = $this->emptyBoard();
        $board[5][1] = 1;
        $state = $this->makeState($board, 2);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 1, [[4, 0]])));
    }

    public function test_cannot_move_out_of_bounds(): void
    {
        $board = $this->emptyBoard();
        $board[1][0] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(1, 0, [[0, -1]])));
    }

    public function test_cannot_move_opponent_piece(): void
    {
        $board = $this->emptyBoard();
        $board[2][1] = 2;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(2, 1, [[3, 0]])));
    }

    // -------- Captures --------

    public function test_single_capture_removes_jumped_piece(): void
    {
        $board = $this->emptyBoard();
        $board[5][2] = 1;
        $board[4][3] = 2;
        $state = $this->makeState($board, 1);

        $move = $this->move(5, 2, [[3, 4]]);
        $this->assertTrue($this->engine->validateMove($state, 1, $move));

        $next = $this->engine->applyMove($state, 1, $move);
        $this->assertSame(0, $next->board[5][2]);
        $this->assertSame(0, $next->board[4][3]);
        $this->assertSame(1, $next->board[3][4]);
        $this->assertSame(2, $next->currentTurn);
    }

    public function test_capture_target_landing_square_must_be_empty(): void
    {
        $board = $this->emptyBoard();
        $board[5][2] = 1;
        $board[4][3] = 2;
        $board[3][4] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 2, [[3, 4]])));
    }

    public function test_cannot_jump_own_piece(): void
    {
        $board = $this->emptyBoard();
        $board[5][2] = 1;
        $board[4][3] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(5, 2, [[3, 4]])));
    }

    public function test_multi_jump_chain_removes_all_jumped_pieces(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;
        $board[4][1] = 2;
        $board[2][3] = 2;
        $state = $this->makeState($board, 1);

        $move = $this->move(5, 0, [[3, 2], [1, 4]]);
        $this->assertTrue($this->engine->validateMove($state, 1, $move));

        $next = $this->engine->applyMove($state, 1, $move);
        $this->assertSame(0, $next->board[5][0]);
        $this->assertSame(0, $next->board[4][1]);
        $this->assertSame(0, $next->board[3][2]);
        $this->assertSame(0, $next->board[2][3]);
        $this->assertSame(1, $next->board[1][4]);
    }

    public function test_mandatory_capture_blocks_non_capture_move(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;
        $board[4][1] = 2;
        $board[6][1] = 1;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(6, 1, [[5, 2]])));
    }

    public function test_mandatory_capture_allows_choice_between_multiple_captures(): void
    {
        $board = $this->emptyBoard();
        $board[4][3] = 1;
        $board[3][2] = 2;
        $board[3][4] = 2;
        $state = $this->makeState($board, 1);

        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[2, 1]])));
        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[2, 5]])));
    }

    public function test_man_cannot_jump_backward(): void
    {
        $board = $this->emptyBoard();
        $board[3][3] = 1;
        $board[4][4] = 2;
        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, $this->move(3, 3, [[5, 5]])));
    }

    // -------- Kings --------

    public function test_man_promotes_to_king_on_reaching_last_row(): void
    {
        $board = $this->emptyBoard();
        $board[1][0] = 1;
        $state = $this->makeState($board, 1);

        $move = $this->move(1, 0, [[0, 1]]);
        $this->assertTrue($this->engine->validateMove($state, 1, $move));

        $next = $this->engine->applyMove($state, 1, $move);
        $this->assertSame(3, $next->board[0][1]);
    }

    public function test_king_moves_diagonally_in_any_direction(): void
    {
        $board = $this->emptyBoard();
        $board[4][3] = 3;
        $state = $this->makeState($board, 1);

        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[3, 2]])));
        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[3, 4]])));
        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[5, 2]])));
        $this->assertTrue($this->engine->validateMove($state, 1, $this->move(4, 3, [[5, 4]])));
    }

    public function test_king_can_capture_backward(): void
    {
        $board = $this->emptyBoard();
        $board[3][2] = 3;
        $board[4][3] = 2;
        $state = $this->makeState($board, 1);

        $move = $this->move(3, 2, [[5, 4]]);
        $this->assertTrue($this->engine->validateMove($state, 1, $move));

        $next = $this->engine->applyMove($state, 1, $move);
        $this->assertSame(3, $next->board[5][4]);
        $this->assertSame(0, $next->board[4][3]);
        $this->assertSame(0, $next->board[3][2]);
    }

    public function test_promotion_mid_jump_ends_chain(): void
    {
        $board = $this->emptyBoard();
        $board[2][1] = 1;
        $board[1][2] = 2;
        $board[1][4] = 2;
        $state = $this->makeState($board, 1);

        $shortPath = $this->move(2, 1, [[0, 3]]);
        $extendedPath = $this->move(2, 1, [[0, 3], [2, 5]]);

        $this->assertTrue($this->engine->validateMove($state, 1, $shortPath));
        $this->assertFalse($this->engine->validateMove($state, 1, $extendedPath));

        $next = $this->engine->applyMove($state, 1, $shortPath);
        $this->assertSame(3, $next->board[0][3]);
        $this->assertSame(0, $next->board[1][2]);
        $this->assertSame(2, $next->board[1][4]);
    }

    // -------- Game over --------

    public function test_game_in_progress_returns_null(): void
    {
        $state = $this->engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
        ]));

        $this->assertNull($this->engine->checkGameOver($state));
    }

    public function test_player_with_no_pieces_loses(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;
        $state = $this->makeState($board, 1);

        $result = $this->engine->checkGameOver($state);
        $this->assertNotNull($result);
        $this->assertFalse($result->draw);
        $this->assertSame($this->players->get(1), $result->winner);
    }

    public function test_player_with_no_legal_moves_loses(): void
    {
        $board = $this->emptyBoard();
        $board[0][1] = 3;
        $board[1][0] = 2;
        $board[1][2] = 2;
        $board[2][3] = 2;
        $state = $this->makeState($board, 1);

        $result = $this->engine->checkGameOver($state);
        $this->assertNotNull($result);
        $this->assertFalse($result->draw);
        $this->assertSame($this->players->get(2), $result->winner);
    }

    // -------- Type guards --------

    public function test_validate_move_throws_on_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $wrongState = new TicTacToeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
            players: $this->players,
        );

        $this->engine->validateMove($wrongState, 1, $this->move(5, 0, [[4, 1]]));
    }

    public function test_validate_move_throws_on_wrong_move_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $state = $this->makeState($this->emptyBoard(), 1);
        $this->engine->validateMove($state, 1, new TicTacToeMoveData(row: 0, col: 0));
    }

    public function test_apply_move_throws_on_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $wrongState = new TicTacToeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
            players: $this->players,
        );

        $this->engine->applyMove($wrongState, 1, $this->move(5, 0, [[4, 1]]));
    }

    public function test_check_game_over_throws_on_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $wrongState = new TicTacToeState(
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
            currentTurn: 1,
            players: $this->players,
        );

        $this->engine->checkGameOver($wrongState);
    }
}
