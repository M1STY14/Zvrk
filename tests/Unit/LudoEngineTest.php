<?php

namespace Tests\Unit;

use App\Data\GameState;
use App\Data\LudoMoveData;
use App\Data\LudoState;
use App\Data\MoveData;
use App\Enums\LudoPhase;
use App\Games\Ludo\LudoEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use RuntimeException;
use Tests\TestCase;

class LudoEngineTest extends TestCase
{
    use RefreshDatabase;

    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->players = collect([
            1 => User::factory()->create()->id,
            2 => User::factory()->create()->id,
            3 => User::factory()->create()->id,
            4 => User::factory()->create()->id,
        ]);
    }

    private function engineWithDice(int|array $dice): LudoEngine
    {
        if (is_int($dice)) {
            return new LudoEngine(fn () => $dice);
        }

        $sequence = $dice;
        $i = 0;

        return new LudoEngine(function () use (&$sequence, &$i) {
            $value = $sequence[$i] ?? throw new RuntimeException('Dice sequence exhausted.');
            $i++;

            return $value;
        });
    }

    private function makeState(
        array $tokens,
        int $currentTurn = 1,
        array $pendingDice = [],
        LudoPhase $phase = LudoPhase::Roll,
        int $consecutiveDoubles = 0,
        ?Collection $players = null,
    ): LudoState {
        return new LudoState(
            tokens: $tokens,
            currentTurn: $currentTurn,
            pendingDice: $pendingDice,
            phase: $phase,
            consecutiveDoubles: $consecutiveDoubles,
            players: $players ?? $this->players,
        );
    }

    private function homeTokens(int $playerCount): array
    {
        $tokens = [];
        for ($i = 1; $i <= $playerCount; $i++) {
            $tokens[$i] = [-1, -1, -1, -1];
        }

        return $tokens;
    }

    private function rollMove(): LudoMoveData
    {
        return new LudoMoveData(action: 'roll', tokenIndex: null, diceValue: null);
    }

    private function tokenMove(int $tokenIndex, int $diceValue): LudoMoveData
    {
        return new LudoMoveData(action: null, tokenIndex: $tokenIndex, diceValue: $diceValue);
    }

    public function test_initial_state_throws_with_less_than_two_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->initialState(collect([User::factory()->create()->id]));
    }

    public function test_initial_state_throws_with_more_than_four_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $ids = collect(range(1, 5))->map(fn () => User::factory()->create()->id);

        (new LudoEngine())->initialState($ids);
    }

    public function test_initial_state_for_two_players(): void
    {
        $engine = new LudoEngine();
        /** @var LudoState $state */
        $state = $engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
        ]));

        $this->assertInstanceOf(LudoState::class, $state);
        $this->assertSame([1 => [-1, -1, -1, -1], 2 => [-1, -1, -1, -1]], $state->tokens);
        $this->assertSame(1, $state->currentTurn);
        $this->assertSame([], $state->pendingDice);
        $this->assertSame(LudoPhase::Roll, $state->phase);
        $this->assertSame(0, $state->consecutiveDoubles);
        $this->assertSame($this->players->get(1), $state->players->get(1));
        $this->assertSame($this->players->get(2), $state->players->get(2));
    }

    public function test_initial_state_for_three_players(): void
    {
        $engine = new LudoEngine();
        /** @var LudoState $state */
        $state = $engine->initialState(collect([
            $this->players->get(1),
            $this->players->get(2),
            $this->players->get(3),
        ]));

        $this->assertSame(
            [1 => [-1, -1, -1, -1], 2 => [-1, -1, -1, -1], 3 => [-1, -1, -1, -1]],
            $state->tokens,
        );
        $this->assertSame(3, $state->players->count());
    }

    public function test_initial_state_for_four_players(): void
    {
        $engine = new LudoEngine();
        /** @var LudoState $state */
        $state = $engine->initialState($this->players->values());

        $this->assertSame(4, $state->players->count());
        $this->assertCount(4, $state->tokens);
    }

    public function test_get_current_turn_returns_state_value(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), currentTurn: 2);

        $this->assertSame(2, $engine->getCurrentTurn($state));
    }

    public function test_validate_move_rejects_wrong_players_turn(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), currentTurn: 1);

        $this->assertFalse($engine->validateMove($state, 2, $this->rollMove()));
    }

    public function test_validate_move_throws_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->validateMove(new class extends GameState {}, 1, $this->rollMove());
    }

    public function test_validate_move_throws_for_wrong_move_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->validateMove($this->makeState($this->homeTokens(2)), 1, new class extends MoveData {});
    }

    public function test_validate_move_in_roll_phase_only_accepts_pure_roll_action(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), phase: LudoPhase::Roll);

        $this->assertTrue($engine->validateMove($state, 1, $this->rollMove()));
        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 5)));
        $this->assertFalse($engine->validateMove($state, 1, new LudoMoveData(action: 'roll', tokenIndex: 0, diceValue: null)));
        $this->assertFalse($engine->validateMove($state, 1, new LudoMoveData(action: 'roll', tokenIndex: null, diceValue: 5)));
    }

    public function test_validate_move_in_move_phase_rejects_roll_action(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), pendingDice: [5, 3], phase: LudoPhase::Move);

        $this->assertFalse($engine->validateMove($state, 1, $this->rollMove()));
    }

    public function test_validate_move_rejects_token_index_out_of_range(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), pendingDice: [5, 3], phase: LudoPhase::Move);

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(-1, 5)));
        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(4, 5)));
    }

    public function test_validate_move_rejects_dice_value_not_in_pending(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [3, 5],
            phase: LudoPhase::Move,
        );

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 4)));
        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 20)));
    }

    public function test_validate_move_rejects_null_dice_value_in_move_phase(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), pendingDice: [5, 3], phase: LudoPhase::Move);

        $this->assertFalse($engine->validateMove($state, 1, new LudoMoveData(action: null, tokenIndex: 0, diceValue: null)));
    }

    public function test_roll_seeds_pending_dice_with_two_values(): void
    {
        $engine = $this->engineWithDice([3, 5]);
        $state = $this->makeState([1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]]);

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        $this->assertSame(LudoPhase::Move, $newState->phase);
        $this->assertSame([3, 5], $newState->pendingDice);
        $this->assertSame(1, $newState->currentTurn);
        $this->assertSame(0, $newState->consecutiveDoubles);
    }

    public function test_doubles_increment_consecutive_doubles(): void
    {
        $engine = $this->engineWithDice([4, 4]);
        $state = $this->makeState([1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]], consecutiveDoubles: 1);

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        $this->assertSame([4, 4], $newState->pendingDice);
        $this->assertSame(2, $newState->consecutiveDoubles);
    }

    public function test_non_doubles_resets_consecutive_doubles(): void
    {
        $engine = $this->engineWithDice([2, 5]);
        $state = $this->makeState([1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]], consecutiveDoubles: 2);

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        $this->assertSame(0, $newState->consecutiveDoubles);
    }

    public function test_roll_with_no_valid_move_passes_turn(): void
    {
        // All home, dice [3, 4] cannot exit (only 5 exits), and bonus values don't apply at roll time.
        $engine = $this->engineWithDice([3, 4]);
        $state = $this->makeState($this->homeTokens(2), currentTurn: 1);

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        $this->assertSame(LudoPhase::Roll, $newState->phase);
        $this->assertSame([], $newState->pendingDice);
        $this->assertSame(2, $newState->currentTurn);
        $this->assertSame(0, $newState->consecutiveDoubles);
    }

    public function test_three_consecutive_doubles_sends_lead_token_home(): void
    {
        $engine = $this->engineWithDice([6, 6]);
        $state = $this->makeState(
            [1 => [-1, 25, 50, 74], 2 => [-1, -1, -1, -1]],
            currentTurn: 1,
            consecutiveDoubles: 2,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        // Index 2 (pos 50) is most-advanced (74 is finished, ignored).
        $this->assertSame(-1, $newState->tokens[1][2]);
        $this->assertSame(25, $newState->tokens[1][1], 'Other tokens unchanged.');
        $this->assertSame(74, $newState->tokens[1][3]);
        $this->assertSame(2, $newState->currentTurn);
        $this->assertSame(0, $newState->consecutiveDoubles);
        $this->assertSame([], $newState->pendingDice);
    }

    public function test_three_consecutive_doubles_with_no_eligible_token_just_ends_turn(): void
    {
        $engine = $this->engineWithDice([3, 3]);
        $state = $this->makeState(
            [1 => [-1, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            currentTurn: 1,
            consecutiveDoubles: 2,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->rollMove());

        $this->assertSame([-1, -1, -1, -1], $newState->tokens[1]);
        $this->assertSame(2, $newState->currentTurn);
        $this->assertSame(0, $newState->consecutiveDoubles);
    }

    public function test_token_at_home_cannot_move_with_non_five(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), pendingDice: [3, 4], phase: LudoPhase::Move);

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 3)));
        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 4)));
    }

    public function test_token_at_home_can_move_with_five(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState($this->homeTokens(2), pendingDice: [5, 3], phase: LudoPhase::Move);

        $this->assertTrue($engine->validateMove($state, 1, $this->tokenMove(0, 5)));

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 5));

        $this->assertSame(0, $newState->tokens[1][0], 'Exits to start square (relative 0).');
        $this->assertContains(3, $newState->pendingDice);
        $this->assertNotContains(5, $newState->pendingDice);
    }

    public function test_bonus_value_cannot_exit_home_token(): void
    {
        $engine = new LudoEngine();
        // Token home with only bonus values pending — none can exit.
        $state = $this->makeState($this->homeTokens(2), pendingDice: [20, 10], phase: LudoPhase::Move);

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 20)));
        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 10)));
    }

    public function test_token_advances_correct_number_of_squares(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [5, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [3, 4],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(8, $newState->tokens[1][0]);
    }

    public function test_token_enters_home_stretch(): void
    {
        $engine = new LudoEngine();
        // Ring spans 0..67; stretch begins at 68. Token at 65 + 4 = 69.
        $state = $this->makeState(
            [1 => [65, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [4, 2],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 4));

        $this->assertSame(69, $newState->tokens[1][0]);
    }

    public function test_token_finishes_with_exact_roll(): void
    {
        $engine = new LudoEngine();
        // Token at 72 + 2 = 74 (finish).
        $state = $this->makeState(
            [1 => [72, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [2, 1],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 2));

        $this->assertSame(74, $newState->tokens[1][0]);
    }

    public function test_overshoot_finish_is_invalid(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [72, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 3)));
    }

    public function test_finished_token_cannot_be_moved(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [74, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [1, 2],
            phase: LudoPhase::Move,
        );

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 1)));
    }

    public function test_apply_move_does_not_mutate_original_tokens(): void
    {
        $engine = new LudoEngine();
        $tokens = [1 => [5, -1, -1, -1], 2 => [-1, -1, -1, -1]];
        $state = $this->makeState($tokens, pendingDice: [3, 4], phase: LudoPhase::Move);

        $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(5, $state->tokens[1][0], 'Original state must not be mutated.');
        $this->assertSame([3, 4], $state->pendingDice);
    }

    public function test_capture_sends_opponent_home_and_pushes_twenty_bonus(): void
    {
        $engine = new LudoEngine();
        // P1 at 11 + 3 = 14, abs (0+14)%68 = 14 (not safe).
        // P2 at 65, abs (17+65)%68 = 14. Captured.
        $state = $this->makeState(
            [1 => [11, -1, -1, -1], 2 => [65, -1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(14, $newState->tokens[1][0]);
        $this->assertSame(-1, $newState->tokens[2][0]);
        $this->assertContains(20, $newState->pendingDice, 'Capture pushes 20 bonus.');
        $this->assertContains(1, $newState->pendingDice);
    }

    public function test_capture_sends_all_opponent_tokens_on_square_home(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [11, -1, -1, -1], 2 => [65, 65, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(-1, $newState->tokens[2][0]);
        $this->assertSame(-1, $newState->tokens[2][1]);
    }

    public function test_safe_zone_start_square_blocks_capture(): void
    {
        $engine = new LudoEngine();
        // P1 at 14, dice 3 -> 17 (P2's start, safe). P2 at 0 (abs 17). No capture.
        $state = $this->makeState(
            [1 => [14, -1, -1, -1], 2 => [0, -1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(17, $newState->tokens[1][0]);
        $this->assertSame(0, $newState->tokens[2][0]);
        $this->assertNotContains(20, $newState->pendingDice);
    }

    public function test_safe_zone_star_square_blocks_capture(): void
    {
        $engine = new LudoEngine();
        // P1 at 5 + 3 = 8 (star, safe). P2 at 59 (abs 8).
        $state = $this->makeState(
            [1 => [5, -1, -1, -1], 2 => [59, -1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 3));

        $this->assertSame(59, $newState->tokens[2][0]);
    }

    public function test_finishing_a_token_pushes_ten_bonus(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [72, 10, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [2, 4],
            phase: LudoPhase::Move,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 2));

        $this->assertSame(74, $newState->tokens[1][0]);
        $this->assertContains(10, $newState->pendingDice, 'Finish pushes 10 bonus.');
        $this->assertContains(4, $newState->pendingDice);
    }

    public function test_blockade_prevents_landing_on_blockaded_square(): void
    {
        $engine = new LudoEngine();
        // P2 has two tokens at relative 1 (abs 18). P1 wants to land on abs 18 (relative 18).
        $state = $this->makeState(
            [1 => [15, -1, -1, -1], 2 => [1, 1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 3)));
    }

    public function test_blockade_prevents_passing_through_blockaded_square(): void
    {
        $engine = new LudoEngine();
        // Blockade at abs 18 (P2 has two tokens at relative 1). P1 at 15, dice 5 -> would land at 20 but passes 18.
        $state = $this->makeState(
            [1 => [15, -1, -1, -1], 2 => [1, 1, -1, -1]],
            pendingDice: [5, 1],
            phase: LudoPhase::Move,
        );

        $this->assertFalse($engine->validateMove($state, 1, $this->tokenMove(0, 5)));
    }

    public function test_own_pair_does_not_block_self(): void
    {
        $engine = new LudoEngine();
        // P1 has a pair at relative 18, and a third token wants to pass through.
        $state = $this->makeState(
            [1 => [15, 18, 18, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [5, 1],
            phase: LudoPhase::Move,
        );

        $this->assertTrue($engine->validateMove($state, 1, $this->tokenMove(0, 5)));
    }

    public function test_single_opponent_token_does_not_block(): void
    {
        $engine = new LudoEngine();
        // P2 has only one token at relative 1 (abs 18). Not a blockade.
        $state = $this->makeState(
            [1 => [15, -1, -1, -1], 2 => [1, -1, -1, -1]],
            pendingDice: [5, 1],
            phase: LudoPhase::Move,
        );

        $this->assertTrue($engine->validateMove($state, 1, $this->tokenMove(0, 5)));
    }

    public function test_doubles_bonus_grants_extra_roll_after_both_dice_spent(): void
    {
        $engine = new LudoEngine();
        // After rolling doubles, spend both dice. Then extra roll.
        $state = $this->makeState(
            [1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [4, 4],
            phase: LudoPhase::Move,
            consecutiveDoubles: 1,
        );

        /** @var LudoState $afterFirst */
        $afterFirst = $engine->applyMove($state, 1, $this->tokenMove(0, 4));
        $this->assertSame([4], $afterFirst->pendingDice);
        $this->assertSame(LudoPhase::Move, $afterFirst->phase);
        $this->assertSame(1, $afterFirst->currentTurn);

        /** @var LudoState $afterSecond */
        $afterSecond = $engine->applyMove($afterFirst, 1, $this->tokenMove(0, 4));
        $this->assertSame([], $afterSecond->pendingDice);
        $this->assertSame(LudoPhase::Roll, $afterSecond->phase);
        $this->assertSame(1, $afterSecond->currentTurn, 'Doubles grant extra turn.');
        $this->assertSame(1, $afterSecond->consecutiveDoubles, 'Counter preserved across extra turn.');
    }

    public function test_unspendable_remaining_dice_forfeit_no_doubles_bonus(): void
    {
        $engine = new LudoEngine();
        // P1: [70, 71, -1, -1]. pendingDice = [4, 4] (doubles), consecutiveDoubles=1.
        // Spend 4 on token 0 -> 74 (finish, +10 bonus).
        // Remaining pending: [4, 10]. Token 0 finished (cannot move). Token 1 at 71, can't add 4 or 10.
        // Tokens 2, 3 home: only 5 exits. Neither 4 nor 10 spendable. Forfeit.
        $state = $this->makeState(
            [1 => [70, 71, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [4, 4],
            phase: LudoPhase::Move,
            consecutiveDoubles: 1,
        );

        /** @var LudoState $newState */
        $newState = $engine->applyMove($state, 1, $this->tokenMove(0, 4));

        $this->assertSame(74, $newState->tokens[1][0]);
        $this->assertSame(LudoPhase::Roll, $newState->phase);
        $this->assertSame([], $newState->pendingDice, 'Unspendable values forfeited.');
        $this->assertSame(2, $newState->currentTurn, 'No extra turn when forfeiting.');
        $this->assertSame(0, $newState->consecutiveDoubles, 'Counter reset on forfeit.');
    }

    public function test_normal_turn_passes_after_both_dice_spent(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [1 => [10, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [3, 4],
            phase: LudoPhase::Move,
            consecutiveDoubles: 0,
        );

        $afterFirst = $engine->applyMove($state, 1, $this->tokenMove(0, 3));
        $afterSecond = $engine->applyMove($afterFirst, 1, $this->tokenMove(0, 4));

        $this->assertSame(LudoPhase::Roll, $afterSecond->phase);
        $this->assertSame(2, $afterSecond->currentTurn);
        $this->assertSame([], $afterSecond->pendingDice);
    }

    public function test_turn_order_two_players(): void
    {
        $engine = new LudoEngine();
        $twoPlayers = collect([1 => $this->players->get(1), 2 => $this->players->get(2)]);

        // P1 spends both dice -> turn passes to P2.
        $state = $this->makeState(
            [1 => [5, -1, -1, -1], 2 => [-1, -1, -1, -1]],
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
            players: $twoPlayers,
        );
        $a = $engine->applyMove($state, 1, $this->tokenMove(0, 3));
        $b = $engine->applyMove($a, 1, $this->tokenMove(0, 1));

        $this->assertSame(2, $b->currentTurn);
    }

    public function test_turn_order_three_players(): void
    {
        $engine = new LudoEngine();
        $threePlayers = collect([
            1 => $this->players->get(1),
            2 => $this->players->get(2),
            3 => $this->players->get(3),
        ]);

        $state = $this->makeState(
            [1 => [-1, -1, -1, -1], 2 => [-1, -1, -1, -1], 3 => [40, -1, -1, -1]],
            currentTurn: 3,
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
            players: $threePlayers,
        );
        $a = $engine->applyMove($state, 3, $this->tokenMove(0, 3));
        $b = $engine->applyMove($a, 3, $this->tokenMove(0, 1));

        $this->assertSame(1, $b->currentTurn);
    }

    public function test_turn_order_four_players(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState(
            [
                1 => [-1, -1, -1, -1],
                2 => [-1, -1, -1, -1],
                3 => [-1, -1, -1, -1],
                4 => [40, -1, -1, -1],
            ],
            currentTurn: 4,
            pendingDice: [3, 1],
            phase: LudoPhase::Move,
        );
        $a = $engine->applyMove($state, 4, $this->tokenMove(0, 3));
        $b = $engine->applyMove($a, 4, $this->tokenMove(0, 1));

        $this->assertSame(1, $b->currentTurn);
    }

    public function test_check_game_over_returns_winner_when_all_tokens_finish(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState([1 => [74, 74, 74, 74], 2 => [10, -1, -1, -1]]);

        $result = $engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_check_game_over_returns_null_when_ongoing(): void
    {
        $engine = new LudoEngine();
        $state = $this->makeState([1 => [74, 74, 74, 70], 2 => [10, -1, -1, -1]]);

        $this->assertNull($engine->checkGameOver($state));
    }

    public function test_check_game_over_throws_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->checkGameOver(new class extends GameState {});
    }

    public function test_apply_move_throws_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->applyMove(new class extends GameState {}, 1, $this->rollMove());
    }

    public function test_apply_move_throws_for_wrong_move_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->applyMove($this->makeState($this->homeTokens(2)), 1, new class extends MoveData {});
    }

    public function test_get_current_turn_throws_for_wrong_state_type(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new LudoEngine())->getCurrentTurn(new class extends GameState {});
    }

    public function test_make_state_round_trip(): void
    {
        $engine = new LudoEngine();
        $original = $this->makeState(
            [1 => [10, -1, 74, 5], 2 => [0, 30, -1, -1]],
            currentTurn: 2,
            pendingDice: [4, 20],
            phase: LudoPhase::Move,
            consecutiveDoubles: 1,
        );

        /** @var LudoState $rebuilt */
        $rebuilt = $engine->makeState($original->toArray());

        $this->assertInstanceOf(LudoState::class, $rebuilt);
        $this->assertSame($original->tokens, $rebuilt->tokens);
        $this->assertSame($original->currentTurn, $rebuilt->currentTurn);
        $this->assertSame($original->pendingDice, $rebuilt->pendingDice);
        $this->assertSame($original->phase, $rebuilt->phase);
        $this->assertSame($original->consecutiveDoubles, $rebuilt->consecutiveDoubles);
        $this->assertSame($original->players->all(), $rebuilt->players->all());
    }

    public function test_make_move_data_round_trip(): void
    {
        $engine = new LudoEngine();

        /** @var LudoMoveData $rollMove */
        $rollMove = $engine->makeMoveData(['action' => 'roll', 'tokenIndex' => null, 'diceValue' => null]);
        $this->assertSame('roll', $rollMove->action);
        $this->assertNull($rollMove->tokenIndex);
        $this->assertNull($rollMove->diceValue);

        /** @var LudoMoveData $tokenMove */
        $tokenMove = $engine->makeMoveData(['action' => null, 'tokenIndex' => 2, 'diceValue' => 5]);
        $this->assertNull($tokenMove->action);
        $this->assertSame(2, $tokenMove->tokenIndex);
        $this->assertSame(5, $tokenMove->diceValue);
    }

    public function test_full_game_flow_player_one_wins(): void
    {
        // Place P1 at four positions just shy of finish; drive scripted dice to walk them home.
        // Each turn P1 rolls a non-doubles pair, spends both dice on the lead token to finish it (with finish bonus).
        // The bonus 10 from finishing is forfeited (no other token can use it), turn passes.
        // Use rolls that avoid doubles: [3, 4] = sums to 7; we'll position tokens at 67 so 67+3+4=74.
        // Setup tokens at [67, 67, 67, 67]. P2 stays home. 4 turns to finish all.
        $tokens = [1 => [67, 67, 67, 67], 2 => [-1, -1, -1, -1]];

        // Each P1 turn: roll [3, 4]. Move token from 67 -> 70 (with 3), then 70 -> 74 (with 4, finishes).
        // After finishing, pendingDice gets +10 bonus. But no other token can use 10 (all at 67/finished/etc).
        // Forfeit, turn passes to P2.
        // P2 has all tokens home, can never roll a 5 (we'll feed their roll [1, 2]) -> P2 turn passes back to P1.
        $diceSequence = [];
        for ($turn = 0; $turn < 4; $turn++) {
            // P1's roll
            $diceSequence[] = 3;
            $diceSequence[] = 4;
            // P2's roll (no exit, turn passes)
            $diceSequence[] = 1;
            $diceSequence[] = 2;
        }
        // The last P2 roll won't actually fire because P1 wins after finishing the 4th token.
        $engine = $this->engineWithDice($diceSequence);
        $twoPlayers = collect([1 => $this->players->get(1), 2 => $this->players->get(2)]);

        $state = $this->makeState($tokens, currentTurn: 1, players: $twoPlayers);

        for ($i = 0; $i < 4; $i++) {
            // P1: roll
            /** @var LudoState $state */
            $state = $engine->applyMove($state, 1, $this->rollMove());
            $this->assertSame(LudoPhase::Move, $state->phase);
            $this->assertSame([3, 4], $state->pendingDice);

            // Find the next not-yet-finished token.
            $tokenToMove = null;
            foreach ($state->tokens[1] as $idx => $pos) {
                if ($pos !== 74) {
                    $tokenToMove = $idx;
                    break;
                }
            }
            $this->assertNotNull($tokenToMove);

            // Spend the 3
            /** @var LudoState $state */
            $state = $engine->applyMove($state, 1, $this->tokenMove($tokenToMove, 3));
            // Spend the 4 (finishes the token, +10 bonus pushed)
            /** @var LudoState $state */
            $state = $engine->applyMove($state, 1, $this->tokenMove($tokenToMove, 4));

            // After finishing the 4th token, the game is over; otherwise turn passes to P2.
            if ($i < 3) {
                $this->assertSame(2, $state->currentTurn);
                // P2 rolls and passes (no 5 to exit).
                /** @var LudoState $state */
                $state = $engine->applyMove($state, 2, $this->rollMove());
                $this->assertSame(1, $state->currentTurn);
            }
        }

        $this->assertSame([74, 74, 74, 74], $state->tokens[1]);

        $result = $engine->checkGameOver($state);
        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }
}
