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
        $state = $this->engine->initialState($this->players);
        $move = new SnapsMoveData(card: new SnapsCard(SnapsSuit::Hearts, SnapsRank::Ace));

        $hand1 = $state->hands->get(1);
        $hand2 = $state->hands->get(2);
        $isInAnyHand = $hand1->contains(fn ($c) => $c->suit === SnapsSuit::Hearts && $c->rank === SnapsRank::Ace)
            || $hand2->contains(fn ($c) => $c->suit === SnapsSuit::Hearts && $c->rank === SnapsRank::Ace);

        if ($isInAnyHand) {
            $this->markTestSkipped('Deck order made the card part of a dealt hand.');
        }

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
        $this->assertTrue($newState->hands->get(1)->isEmpty());
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
}
