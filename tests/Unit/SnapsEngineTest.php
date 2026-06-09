<?php

namespace Tests\Unit;

use App\Data\SnapsCard;
use App\Data\SnapsMoveData;
use App\Data\SnapsState;
use App\Enums\SnapsRank;
use App\Enums\SnapsSuit;
use App\Games\Snaps\SnapsEngine;
use App\Models\User;
use Closure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use Tests\TestCase;

class SnapsEngineTest extends TestCase
{
    use RefreshDatabase;

    private SnapsEngine $engine;
    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new SnapsEngine;
        $this->players = collect([
            User::factory()->create()->id,
            User::factory()->create()->id,
        ]);
    }

    public function test_initial_state_requires_two_players(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->engine->initialState(collect([$this->players->get(0)]));
    }

    public function test_initial_state_deals_five_cards_each_and_nine_card_stock(): void
    {
        $state = $this->engine->initialState($this->players);

        $this->assertInstanceOf(SnapsState::class, $state);
        $this->assertCount(5, $state->hands->get(1));
        $this->assertCount(5, $state->hands->get(2));
        $this->assertSame(9, $state->stock->count());
        $this->assertNotNull($state->trumpCard);
        $this->assertSame(1, $state->currentTurn);
        $this->assertTrue($state->drawQueue->isEmpty());
        $this->assertSame(0, $state->scores->get(1));
        $this->assertSame(0, $state->scores->get(2));
    }

    public function test_draw_move_draws_one_random_card_and_advances_draw_queue(): void
    {
        $state = $this->engine->initialState($this->players);
        $firstCard = $state->hands->get(1)->first();
        $state = $this->engine->applyMove($state, 1, new SnapsMoveData(card: $firstCard));

        $secondCard = $state->hands->get(2)->first();
        $state = $this->engine->applyMove($state, 2, new SnapsMoveData(card: $secondCard));

        $this->assertCount(2, $state->drawQueue);
        $firstDrawer = $state->drawQueue->first();
        $beforeHandCount = $state->hands->get($firstDrawer)->count();
        $beforeStockCount = $state->stock->count();

        $state = $this->engine->applyMove($state, $firstDrawer, new SnapsMoveData(draw: true));

        $this->assertCount(1, $state->drawQueue);
        $this->assertSame($beforeHandCount + 1, $state->hands->get($firstDrawer)->count());
        $this->assertSame($beforeStockCount - 1, $state->stock->count());
    }

    public function test_validate_move_rejects_wrong_players_turn(): void
    {
        $state = $this->engine->initialState($this->players);
        $move = new SnapsMoveData(card: $state->hands->get(1)->first());

        $this->assertFalse($this->engine->validateMove($state, 2, $move));
    }

    public function test_validate_move_rejects_card_not_in_hand(): void
    {
        $state = new SnapsState(
            players: collect([1 => $this->players->get(0), 2 => $this->players->get(1)]),
            currentTurn: 1,
            hands: collect([
                1 => collect([new SnapsCard(SnapsSuit::Spades, SnapsRank::Ace)]),
                2 => collect([new SnapsCard(SnapsSuit::Clubs, SnapsRank::King)]),
            ]),
            stock: collect([new SnapsCard(SnapsSuit::Clubs, SnapsRank::Queen)]),
            trumpCard: new SnapsCard(SnapsSuit::Diamonds, SnapsRank::Jack),
            trick: collect(),
            capturedPoints: collect([1 => 0, 2 => 0]),
            scores: collect([1 => 0, 2 => 0]),
            lastTrickWinner: null,
            drawQueue: collect(),
        );

        // Hearts-Ace is not in player 1's hand, so the move must be rejected.
        $move = new SnapsMoveData(card: new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ace));

        $this->assertFalse($this->engine->validateMove($state, 1, $move));
    }

    public function test_game_over_when_score_reaches_501(): void
    {
        $state = new SnapsState(
            players: collect([1 => $this->players->get(0), 2 => $this->players->get(1)]),
            currentTurn: 1,
            hands: collect([1 => collect(), 2 => collect()]),
            stock: collect(),
            trumpCard: new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ace),
            trick: collect(),
            capturedPoints: collect([1 => 0, 2 => 0]),
            scores: collect([1 => 501, 2 => 492]),
            lastTrickWinner: null,
            drawQueue: collect(),
        );

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(0), $result->winner);
    }

    public function test_winner_gets_bonus_point_when_reaching_501(): void
    {
        $state = new SnapsState(
            players: collect([1 => $this->players->get(0), 2 => $this->players->get(1)]),
            currentTurn: 1,
            hands: collect([1 => collect(), 2 => collect()]),
            stock: collect(),
            trumpCard: new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ace),
            trick: collect(),
            capturedPoints: collect([1 => 1, 2 => 0]),
            scores: collect([1 => 500, 2 => 492]),
            lastTrickWinner: null,
            drawQueue: collect(),
        );

        $completeDeal = Closure::bind(function (SnapsState $state) {
            return $this->completeDeal($state);
        }, $this->engine, SnapsEngine::class);

        $newState = $completeDeal($state);

        $this->assertSame(502, $newState->scores->get(1));
        $this->assertTrue($newState->hands->isEmpty());
        $this->assertTrue($newState->stock->isEmpty());
    }

    public function test_apply_move_places_card_and_switches_turn(): void
    {
        $state = $this->engine->initialState($this->players);
        $firstCard = $state->hands->get(1)->first();
        $move = new SnapsMoveData(card: $firstCard);

        $newState = $this->engine->applyMove($state, 1, $move);

        $this->assertSame(2, $newState->currentTurn);
        $this->assertCount(4, $newState->hands->get(1));
    }

    public function test_state_serializes_cards_to_wire_strings_and_round_trips(): void
    {
        $state = $this->engine->initialState($this->players);

        $array = $state->toArray();

        // Cards must leave the backend as "H-A" strings, which is what the frontend and makeState() expect.
        $this->assertIsString($array['trumpCard']);
        $this->assertIsString($array['hands'][1][0]);
        $this->assertIsString($array['stock'][0]);

        $restored = $this->engine->makeState($array);

        $this->assertInstanceOf(SnapsCard::class, $restored->trumpCard);
        $this->assertSame($array['trumpCard'], $restored->trumpCard->toString());
        $this->assertSame($array, $restored->toArray());
    }

    public function test_endgame_requires_following_the_led_suit(): void
    {
        $state = $this->endgameRespondingState();

        $followsSuit = new SnapsMoveData(card: new SnapsCard(SnapsSuit::Hearts, SnapsRank::King));
        $ignoresSuit = new SnapsMoveData(card: new SnapsCard(SnapsSuit::Spades, SnapsRank::Ace));

        $this->assertTrue($this->engine->validateMove($state, 2, $followsSuit));
        $this->assertFalse($this->engine->validateMove($state, 2, $ignoresSuit));
    }

    public function test_open_phase_allows_discarding_off_suit(): void
    {
        $state = $this->endgameRespondingState(stock: collect([new SnapsCard(SnapsSuit::Clubs, SnapsRank::Queen)]));

        $ignoresSuit = new SnapsMoveData(card: new SnapsCard(SnapsSuit::Spades, SnapsRank::Ace));

        $this->assertTrue($this->engine->validateMove($state, 2, $ignoresSuit));
    }

    public function test_completed_trick_is_kept_in_last_trick_for_clients(): void
    {
        $state = new SnapsState(
            players: collect([1 => $this->players->get(0), 2 => $this->players->get(1)]),
            currentTurn: 2,
            hands: collect([
                1 => collect([new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ten)]),
                2 => collect([new SnapsCard(SnapsSuit::Hearts, SnapsRank::King)]),
            ]),
            stock: collect([
                new SnapsCard(SnapsSuit::Clubs, SnapsRank::Queen),
                new SnapsCard(SnapsSuit::Clubs, SnapsRank::Jack),
            ]),
            trumpCard: new SnapsCard(SnapsSuit::Diamonds, SnapsRank::Jack),
            trick: collect([
                ['player' => 1, 'card' => new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ace), 'marriagePoints' => 0],
            ]),
            capturedPoints: collect([1 => 0, 2 => 0]),
            scores: collect([1 => 0, 2 => 0]),
            lastTrickWinner: null,
            drawQueue: collect(),
        );

        $newState = $this->engine->applyMove($state, 2, new SnapsMoveData(card: new SnapsCard(SnapsSuit::Hearts, SnapsRank::King)));

        // The live trick is swept, but both cards survive in lastTrick so the opponent can still see them.
        $this->assertTrue($newState->trick->isEmpty());
        $this->assertCount(2, $newState->lastTrick);

        $cards = $newState->lastTrick->map(fn ($item) => $item['card']->toString())->all();
        $this->assertContains('H-A', $cards);
        $this->assertContains('H-K', $cards);
    }

    /**
     * Player 2 is responding to a Hearts lead with a Heart and an off-suit card in hand.
     * Trump is Diamonds, so neither card is a trump. Pass a non-empty $stock to model the open phase.
     */
    private function endgameRespondingState(Collection $stock = new Collection()): SnapsState
    {
        return new SnapsState(
            players: collect([1 => $this->players->get(0), 2 => $this->players->get(1)]),
            currentTurn: 2,
            hands: collect([
                1 => collect([new SnapsCard(SnapsSuit::Spades, SnapsRank::Ten)]),
                2 => collect([
                    new SnapsCard(SnapsSuit::Hearts, SnapsRank::King),
                    new SnapsCard(SnapsSuit::Spades, SnapsRank::Ace),
                ]),
            ]),
            stock: $stock,
            trumpCard: new SnapsCard(SnapsSuit::Diamonds, SnapsRank::Jack),
            trick: collect([
                ['player' => 1, 'card' => new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ten), 'marriagePoints' => 0],
            ]),
            capturedPoints: collect([1 => 0, 2 => 0]),
            scores: collect([1 => 0, 2 => 0]),
            lastTrickWinner: 1,
            drawQueue: collect(),
        );
    }
}
