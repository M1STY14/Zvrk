<?php

namespace Tests\Unit;

use App\Data\ConnectFourMoveData;
use App\Data\ConnectFourState;
use App\Data\GameState;
use App\Data\MoveData;
use App\Games\ConnectFourEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Tests\TestCase;

class ConnectFourEngineTest extends TestCase
{
    use RefreshDatabase;

    private ConnectFourEngine $engine;

    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new ConnectFourEngine;
        $this->players = collect([
            1 => User::factory()->create()->id,
            2 => User::factory()->create()->id,
        ]);
    }

    private function makeState(array $board, int $currentTurn): ConnectFourState
    {
        return new ConnectFourState(
            board: $board,
            currentTurn: $currentTurn,
            players: $this->players,
        );
    }

    private function emptyBoard(): array
    {
        return array_fill(0, 6, array_fill(0, 7, 0));
    }

    public function test_initial_state_requires_two_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect([User::factory()->create()->id]));
    }

    public function test_initial_state_is_empty_and_player_one_starts(): void
    {
        $state = $this->engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
        ]));

        $this->assertSame($this->emptyBoard(), $state->board);
        $this->assertSame(1, $state->currentTurn);
    }

    public function test_validate_move_rejects_wrong_turn(): void
    {
        $state = $this->makeState($this->emptyBoard(), 1);

        $this->assertFalse($this->engine->validateMove($state, 2, new ConnectFourMoveData(col: 0)));
    }

    public function test_validate_move_rejects_out_of_bounds_column(): void
    {
        $state = $this->makeState($this->emptyBoard(), 1);

        $this->assertFalse($this->engine->validateMove($state, 1, new ConnectFourMoveData(col: -1)));
        $this->assertFalse($this->engine->validateMove($state, 1, new ConnectFourMoveData(col: 7)));
    }

    public function test_validate_move_rejects_full_column(): void
    {
        $board = $this->emptyBoard();
        for ($row = 0; $row < 6; $row++) {
            $board[$row][2] = 1;
        }

        $state = $this->makeState($board, 1);

        $this->assertFalse($this->engine->validateMove($state, 1, new ConnectFourMoveData(col: 2)));
    }

    public function test_apply_move_drops_to_lowest_empty_slot(): void
    {
        $board = $this->emptyBoard();
        $board[5][3] = 1;

        $state = $this->makeState($board, 2);
        $next = $this->engine->applyMove($state, 2, new ConnectFourMoveData(col: 3));

        $this->assertSame(2, $next->board[4][3]);
        $this->assertSame(1, $next->currentTurn);
    }

    public function test_horizontal_win_is_detected(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;
        $board[5][1] = 1;
        $board[5][2] = 1;
        $board[5][3] = 1;

        $result = $this->engine->checkGameOver($this->makeState($board, 2));

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_vertical_win_is_detected(): void
    {
        $board = $this->emptyBoard();
        $board[5][4] = 2;
        $board[4][4] = 2;
        $board[3][4] = 2;
        $board[2][4] = 2;

        $result = $this->engine->checkGameOver($this->makeState($board, 1));

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(2), $result->winner);
    }

    public function test_diagonal_wins_are_detected(): void
    {
        $upRight = $this->emptyBoard();
        $upRight[5][0] = 1;
        $upRight[4][1] = 1;
        $upRight[3][2] = 1;
        $upRight[2][3] = 1;

        $upLeft = $this->emptyBoard();
        $upLeft[5][6] = 2;
        $upLeft[4][5] = 2;
        $upLeft[3][4] = 2;
        $upLeft[2][3] = 2;

        $resultA = $this->engine->checkGameOver($this->makeState($upRight, 2));
        $resultB = $this->engine->checkGameOver($this->makeState($upLeft, 1));

        $this->assertSame($this->players->get(1), $resultA?->winner);
        $this->assertSame($this->players->get(2), $resultB?->winner);
    }

    public function test_draw_is_detected_when_full_without_winner(): void
    {
        $board = [
            [1, 1, 2, 2, 1, 1, 2],
            [2, 2, 1, 1, 2, 2, 1],
            [1, 1, 2, 2, 1, 1, 2],
            [2, 2, 1, 1, 2, 2, 1],
            [1, 1, 2, 2, 1, 1, 2],
            [2, 2, 1, 1, 2, 2, 1],
        ];

        $result = $this->engine->checkGameOver($this->makeState($board, 1));

        $this->assertNotNull($result);
        $this->assertNull($result->winner);
        $this->assertTrue($result->draw);
    }

    public function test_check_game_over_returns_null_when_game_is_ongoing(): void
    {
        $board = $this->emptyBoard();
        $board[5][0] = 1;
        $board[5][1] = 2;

        $this->assertNull($this->engine->checkGameOver($this->makeState($board, 1)));
    }

    public function test_type_guards_throw_for_invalid_state_or_move(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $fakeState = new class extends GameState {};
        $this->engine->validateMove($fakeState, 1, new ConnectFourMoveData(col: 0));
    }

    public function test_make_state_and_move_data_hydrate_correctly(): void
    {
        $state = $this->engine->makeState([
            'board' => $this->emptyBoard(),
            'currentTurn' => 2,
            'players' => ['1' => $this->players->get(1), '2' => $this->players->get(2)],
            'forfeited' => [1],
        ]);
        $move = $this->engine->makeMoveData(['col' => 5]);

        $this->assertInstanceOf(ConnectFourState::class, $state);
        $this->assertSame(2, $state->currentTurn);
        $this->assertSame([1], $state->forfeited);
        $this->assertInstanceOf(ConnectFourMoveData::class, $move);
        $this->assertSame(5, $move->col);
    }

    public function test_forfeit_and_active_players_are_tracked(): void
    {
        $state = $this->makeState($this->emptyBoard(), 1);

        $next = $this->engine->forfeitPlayer($state, 2);

        $this->assertSame([2], $next->forfeited);
        $this->assertSame([1], $this->engine->activePlayerNumbers($next));
    }
}

