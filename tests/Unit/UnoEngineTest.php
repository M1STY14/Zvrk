<?php

namespace Tests\Unit;

use App\Data\GameResult;
use App\Data\UnoMoveData;
use App\Data\UnoState;
use App\Games\Uno\UnoEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Tests\TestCase;

class UnoEngineTest extends TestCase
{
    use RefreshDatabase;

    private UnoEngine $engine;

    private Collection $twoPlayers;

    private Collection $threePlayers;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new UnoEngine;

        $this->twoPlayers = collect([
            User::factory()->create()->id,
            User::factory()->create()->id,
        ]);

        $this->threePlayers = collect([
            User::factory()->create()->id,
            User::factory()->create()->id,
            User::factory()->create()->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private function card(string $color, string $type, ?int $value = null): array
    {
        return ['color' => $color, 'type' => $type, 'value' => $value];
    }

    private function numberCard(string $color, int $value): array
    {
        return $this->card($color, 'number', $value);
    }

    private function buildState(
        array $hands,
        array $discardPile,
        array $drawPile = [],
        int $currentTurn = 1,
        int $direction = 1,
        string $currentColor = 'red',
        array $forfeited = [],
        bool $drewThisTurn = false,
    ): UnoState {
        $players = collect(array_combine(
            range(1, count($hands)),
            $this->twoPlayers->take(count($hands))->values()->all()
        ));

        return new UnoState(
            hands: array_combine(range(1, count($hands)), array_values($hands)),
            drawPile: $drawPile,
            discardPile: $discardPile,
            currentTurn: $currentTurn,
            direction: $direction,
            currentColor: $currentColor,
            players: $players,
            forfeited: $forfeited,
            drewThisTurn: $drewThisTurn,
        );
    }

    private function buildStateFor(
        Collection $players,
        array $hands,
        array $discardPile,
        array $drawPile = [],
        int $currentTurn = 1,
        int $direction = 1,
        string $currentColor = 'red',
        array $forfeited = [],
    ): UnoState {
        $numberedPlayers = collect(array_combine(
            range(1, $players->count()),
            $players->values()->all()
        ));

        return new UnoState(
            hands: array_combine(range(1, count($hands)), array_values($hands)),
            drawPile: $drawPile,
            discardPile: $discardPile,
            currentTurn: $currentTurn,
            direction: $direction,
            currentColor: $currentColor,
            players: $numberedPlayers,
            forfeited: $forfeited,
        );
    }

    // -------------------------------------------------------------------------
    // Initial state
    // -------------------------------------------------------------------------

    public function test_initial_state_requires_two_to_four_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect([User::factory()->create()->id]));
    }

    public function test_initial_state_rejects_five_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect(User::factory()->count(5)->create()->pluck('id')->all()));
    }

    public function test_initial_state_deals_seven_cards_each(): void
    {
        $state = $this->engine->initialState($this->twoPlayers);

        $this->assertCount(7, $state->hands[1]);
        $this->assertCount(7, $state->hands[2]);
    }

    public function test_initial_state_has_108_total_cards(): void
    {
        $state = $this->engine->initialState($this->twoPlayers);

        $total = count($state->hands[1]) + count($state->hands[2])
            + count($state->drawPile) + count($state->discardPile);

        $this->assertSame(108, $total);
    }

    public function test_initial_state_first_discard_is_not_wild(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $state = $this->engine->initialState($this->twoPlayers);
            $top = $state->discardPile[0];
            $this->assertNotSame('wild', $top['color'], 'First discard should not be a Wild card');
        }
    }

    public function test_initial_state_player_one_starts(): void
    {
        $state = $this->engine->initialState($this->twoPlayers);
        $this->assertSame(1, $state->currentTurn);
        $this->assertSame(1, $state->direction);
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    public function test_validate_rejects_wrong_turn(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('red', 5)]],
            [$this->numberCard('red', 3)],
            currentTurn: 1
        );

        $this->assertFalse($this->engine->validateMove($state, 2, new UnoMoveData(cardIndex: 0)));
    }

    public function test_validate_rejects_out_of_bounds_card_index(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('red', 5)]],
            [$this->numberCard('red', 3)],
        );

        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 5)));
        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: -1)));
    }

    public function test_validate_accepts_matching_color(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 7)], []],
            [$this->numberCard('red', 3)],
        );

        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0)));
    }

    public function test_validate_accepts_matching_number(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 3)], []],
            [$this->numberCard('red', 3)],
        );

        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0)));
    }

    public function test_validate_rejects_mismatched_card(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], []],
            [$this->numberCard('red', 3)],
        );

        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0)));
    }

    public function test_validate_wild_requires_wild_color(): void
    {
        $state = $this->buildState(
            [[$this->card('wild', 'wild')], []],
            [$this->numberCard('red', 3)],
        );

        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0)));
        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0, wildColor: 'blue')));
    }

    public function test_validate_wild_draw_four_blocked_when_matching_color_in_hand(): void
    {
        $state = $this->buildState(
            [[$this->card('wild', 'wild_draw_four'), $this->numberCard('red', 5)], []],
            [$this->numberCard('red', 3)],
            currentColor: 'red',
        );

        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0, wildColor: 'blue')));
    }

    public function test_validate_wild_draw_four_allowed_when_no_matching_color(): void
    {
        $state = $this->buildState(
            [[$this->card('wild', 'wild_draw_four'), $this->numberCard('blue', 5)], []],
            [$this->numberCard('red', 3)],
            currentColor: 'red',
        );

        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(cardIndex: 0, wildColor: 'blue')));
    }

    public function test_validate_draw_action(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], []],
            [$this->numberCard('red', 3)],
            drawPile: [$this->numberCard('green', 1)],
        );

        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(action: 'draw')));
    }

    public function test_validate_cannot_draw_twice(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], []],
            [$this->numberCard('red', 3)],
            drewThisTurn: true,
        );

        $this->assertFalse($this->engine->validateMove($state, 1, new UnoMoveData(action: 'draw')));
    }

    public function test_validate_pass_allowed_after_drawing(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], []],
            [$this->numberCard('red', 3)],
            drewThisTurn: true,
        );

        $this->assertTrue($this->engine->validateMove($state, 1, new UnoMoveData(action: 'pass')));
    }

    // -------------------------------------------------------------------------
    // Apply move
    // -------------------------------------------------------------------------

    public function test_apply_play_removes_card_from_hand(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5), $this->numberCard('blue', 3)], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        $this->assertCount(1, $next->hands[1]);
        // cardIndex 0 = red 5 was played, blue 3 remains
        $this->assertSame(3, $next->hands[1][0]['value']);
    }

    public function test_apply_play_advances_turn(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        $this->assertSame(2, $next->currentTurn);
    }

    public function test_apply_skip_skips_next_player_in_3_player_game(): void
    {
        $state = $this->buildStateFor(
            $this->threePlayers,
            [
                [$this->card('red', 'skip')],
                [$this->numberCard('red', 1)],
                [$this->numberCard('red', 2)],
            ],
            [$this->numberCard('red', 3)],
            currentTurn: 1,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        // Player 2 is skipped, turn goes to player 3
        $this->assertSame(3, $next->currentTurn);
    }

    public function test_apply_reverse_flips_direction_in_3_player_game(): void
    {
        $state = $this->buildStateFor(
            $this->threePlayers,
            [
                [$this->card('red', 'reverse')],
                [$this->numberCard('red', 1)],
                [$this->numberCard('red', 2)],
            ],
            [$this->numberCard('red', 3)],
            currentTurn: 1,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        // Direction reversed: from player 1 going backwards → player 3
        $this->assertSame(-1, $next->direction);
        $this->assertSame(3, $next->currentTurn);
    }

    public function test_apply_reverse_acts_as_skip_in_2_player_game(): void
    {
        $state = $this->buildState(
            [[$this->card('red', 'reverse')], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            currentTurn: 1,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        // In 2-player, reverse = skip → player 1 plays again
        $this->assertSame(1, $next->currentTurn);
    }

    public function test_apply_draw_two_gives_next_player_two_cards_and_skips(): void
    {
        $state = $this->buildState(
            [[$this->card('red', 'draw_two')], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            drawPile: array_fill(0, 5, $this->numberCard('green', 1)),
            currentTurn: 1,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0));

        // Player 2 has 1 + 2 drawn = 3 cards, and is skipped
        $this->assertCount(3, $next->hands[2]);
        $this->assertSame(1, $next->currentTurn);
    }

    public function test_apply_wild_sets_color(): void
    {
        $state = $this->buildState(
            [[$this->card('wild', 'wild')], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            currentTurn: 1,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0, wildColor: 'green'));

        $this->assertSame('green', $next->currentColor);
        $this->assertSame(2, $next->currentTurn);
    }

    public function test_apply_wild_draw_four_gives_next_player_four_cards_and_skips(): void
    {
        $state = $this->buildState(
            [[$this->card('wild', 'wild_draw_four')], [$this->numberCard('blue', 1)]],
            [$this->numberCard('red', 3)],
            drawPile: array_fill(0, 6, $this->numberCard('green', 1)),
            currentTurn: 1,
            currentColor: 'red',
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(cardIndex: 0, wildColor: 'blue'));

        $this->assertCount(5, $next->hands[2]); // 1 + 4
        $this->assertSame('blue', $next->currentColor);
        $this->assertSame(1, $next->currentTurn); // skipped player 2
    }

    public function test_apply_draw_adds_card_and_stays_on_turn_if_playable(): void
    {
        $drawPile = [$this->numberCard('red', 9)]; // red matches current color red

        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            drawPile: $drawPile,
            currentTurn: 1,
            currentColor: 'red',
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(action: 'draw'));

        $this->assertCount(2, $next->hands[1]);
        $this->assertSame(1, $next->currentTurn); // stay on turn — card is playable
        $this->assertTrue($next->drewThisTurn);
    }

    public function test_apply_draw_advances_turn_if_drawn_card_not_playable(): void
    {
        $drawPile = [$this->numberCard('blue', 7)]; // blue doesn't match red

        $state = $this->buildState(
            [[$this->numberCard('green', 2)], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            drawPile: $drawPile,
            currentTurn: 1,
            currentColor: 'red',
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(action: 'draw'));

        $this->assertCount(2, $next->hands[1]);
        $this->assertSame(1, $next->currentTurn); // drewThisTurn = false, still player's turn to pass
        $this->assertFalse($next->drewThisTurn);
    }

    public function test_apply_pass_advances_turn(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
            currentTurn: 1,
            drewThisTurn: true,
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(action: 'pass'));

        $this->assertSame(2, $next->currentTurn);
        $this->assertFalse($next->drewThisTurn);
    }

    // -------------------------------------------------------------------------
    // Game over
    // -------------------------------------------------------------------------

    public function test_check_game_over_returns_winner_when_hand_empty(): void
    {
        $state = $this->buildState(
            [[], [$this->numberCard('red', 1)]],
            [$this->numberCard('red', 3)],
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertInstanceOf(GameResult::class, $result);
        $this->assertNotNull($result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_check_game_over_returns_null_while_all_have_cards(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('blue', 3)]],
            [$this->numberCard('red', 3)],
        );

        $this->assertNull($this->engine->checkGameOver($state));
    }

    // -------------------------------------------------------------------------
    // Reshuffle
    // -------------------------------------------------------------------------

    public function test_reshuffle_discard_into_draw_when_deck_empty(): void
    {
        // Draw pile empty, discard has multiple cards
        $state = $this->buildState(
            [[$this->numberCard('blue', 7)], [$this->numberCard('red', 1)]],
            [
                $this->numberCard('green', 5),
                $this->numberCard('yellow', 2),
                $this->numberCard('red', 3),
            ],
            drawPile: [],
            currentTurn: 1,
            currentColor: 'red',
        );

        $next = $this->engine->applyMove($state, 1, new UnoMoveData(action: 'draw'));

        // Player drew a card (from reshuffled discard)
        $this->assertCount(2, $next->hands[1]);
        // Only 1 card left in discard (the top)
        $this->assertCount(1, $next->discardPile);
    }

    // -------------------------------------------------------------------------
    // Forfeit and active players
    // -------------------------------------------------------------------------

    public function test_forfeit_player_removes_from_active(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('blue', 3)]],
            [$this->numberCard('red', 3)],
        );

        $next = $this->engine->forfeitPlayer($state, 2);

        $this->assertSame([2], $next->forfeited);
        $this->assertSame([1], $this->engine->activePlayerNumbers($next));
    }

    public function test_forfeit_advances_turn_if_forfeited_player_is_current(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('blue', 3)]],
            [$this->numberCard('red', 3)],
            currentTurn: 2,
        );

        $next = $this->engine->forfeitPlayer($state, 2);

        $this->assertSame(1, $next->currentTurn);
    }

    // -------------------------------------------------------------------------
    // Hidden state
    // -------------------------------------------------------------------------

    public function test_state_for_player_hides_other_hands(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5), $this->numberCard('blue', 3)], [$this->numberCard('green', 7)]],
            [$this->numberCard('red', 3)],
        );

        $view = $state->stateForPlayer(1);

        $this->assertArrayHasKey('ownHand', $view);
        $this->assertArrayNotHasKey('hands', $view);
        $this->assertCount(2, $view['ownHand']);
        $this->assertArrayHasKey('opponentHandSizes', $view);
        $this->assertSame(1, $view['opponentHandSizes'][2]);
    }

    public function test_public_broadcast_strips_hands_and_draw_pile(): void
    {
        $state = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('blue', 3)]],
            [$this->numberCard('red', 3)],
            drawPile: array_fill(0, 10, $this->numberCard('green', 1)),
        );

        $broadcast = $state->publicBroadcast();

        $this->assertIsInt($broadcast['hands'][1]);
        $this->assertIsInt($broadcast['hands'][2]);
        $this->assertIsInt($broadcast['drawPile']);
        $this->assertSame(10, $broadcast['drawPile']);
    }

    // -------------------------------------------------------------------------
    // Hydration
    // -------------------------------------------------------------------------

    public function test_make_state_hydrates_correctly(): void
    {
        $original = $this->buildState(
            [[$this->numberCard('red', 5)], [$this->numberCard('blue', 3)]],
            [$this->numberCard('red', 3)],
            currentTurn: 2,
            direction: -1,
            currentColor: 'green',
        );

        $hydrated = $this->engine->makeState($original->toArray());

        $this->assertInstanceOf(UnoState::class, $hydrated);
        $this->assertSame(2, $hydrated->currentTurn);
        $this->assertSame(-1, $hydrated->direction);
        $this->assertSame('green', $hydrated->currentColor);
    }

    public function test_make_move_data_hydrates_correctly(): void
    {
        $move = $this->engine->makeMoveData(['cardIndex' => 3, 'wildColor' => 'red']);

        $this->assertInstanceOf(UnoMoveData::class, $move);
        $this->assertSame(3, $move->cardIndex);
        $this->assertSame('red', $move->wildColor);
    }
}