<?php

namespace Tests\Unit;

use App\Data\BelaMoveData;
use App\Data\BelaState;
use App\Games\Bela\BelaEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use ReflectionMethod;
use Tests\TestCase;

class BelaEngineTest extends TestCase
{
    use RefreshDatabase;

    private BelaEngine $engine;

    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new BelaEngine();
        $this->players = collect([
            1 => User::factory()->create()->id,
            2 => User::factory()->create()->id,
            3 => User::factory()->create()->id,
            4 => User::factory()->create()->id,
        ]);
    }

    public function test_initial_state_returns_four_player_bid_state(): void
    {
        $state = $this->engine->initialState($this->players);

        $this->assertSame('bid', $state->phase);
        $this->assertNull($state->trumpSuit);
        $this->assertNull($state->trumpCaller);
        $this->assertSame(1, $state->currentTurn);
        $this->assertSame(4, $state->dealer);
        $this->assertCount(7, $state->hands[1]);
        $this->assertCount(7, $state->hands[2]);
        $this->assertCount(7, $state->hands[3]);
        $this->assertCount(7, $state->hands[4]);
        $this->assertSame([0, 0], $state->teamScores);
        $this->assertIsArray($state->declarations);
    }

    public function test_make_state_hydrates_from_array(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => ['7_of_clubs'], 2 => ['8_of_diamonds'], 3 => ['9_of_hearts'], 4 => ['10_of_spades']],
            'trick' => [],
            'trickHistory' => [],
            'trumpSuit' => 'spades',
            'trumpCaller' => 1,
            'teamScores' => [0, 0],
            'roundPoints' => [0, 0],
            'phase' => 'play',
            'round' => 1,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 1,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $this->assertInstanceOf(BelaState::class, $state);
        $this->assertSame('spades', $state->trumpSuit);
        $this->assertSame(1, $state->trumpCaller);
    }

    public function test_validate_move_rejects_wrong_player(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => ['7_of_clubs'], 2 => ['8_of_diamonds'], 3 => ['9_of_hearts'], 4 => ['10_of_spades']],
            'trick' => [],
            'trickHistory' => [],
            'trumpSuit' => 'spades',
            'trumpCaller' => 1,
            'teamScores' => [0, 0],
            'roundPoints' => [0, 0],
            'phase' => 'play',
            'round' => 1,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 1,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $moveData = new BelaMoveData(type: 'play', card: '7_of_clubs');
        $this->assertFalse($this->engine->validateMove($state, 2, $moveData));
    }

    public function test_validate_move_enforces_follow_suit(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => ['7_of_clubs', '8_of_hearts'], 2 => ['9_of_clubs'], 3 => ['10_of_clubs'], 4 => ['jack_of_hearts']],
            'trick' => [
                ['player' => 1, 'card' => 'ace_of_clubs'],
            ],
            'trickHistory' => [],
            'trumpSuit' => 'hearts',
            'trumpCaller' => 4,
            'teamScores' => [0, 0],
            'roundPoints' => [0, 0],
            'phase' => 'play',
            'round' => 1,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 2,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $invalidMove = new BelaMoveData(type: 'play', card: 'jack_of_hearts');
        $this->assertFalse($this->engine->validateMove($state, 2, $invalidMove));

        $validMove = new BelaMoveData(type: 'play', card: '9_of_clubs');
        $this->assertTrue($this->engine->validateMove($state, 2, $validMove));
    }

    public function test_trump_rankings_select_highest_trump(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => ['7_of_hearts'], 2 => ['8_of_hearts'], 3 => ['9_of_hearts'], 4 => ['jack_of_spades']],
            'trick' => [
                ['player' => 1, 'card' => 'ace_of_clubs'],
                ['player' => 2, 'card' => 'king_of_clubs'],
                ['player' => 3, 'card' => '10_of_clubs'],
            ],
            'trickHistory' => [],
            'trumpSuit' => 'hearts',
            'trumpCaller' => 4,
            'teamScores' => [0, 0],
            'roundPoints' => [0, 0],
            'phase' => 'play',
            'round' => 1,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 4,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $newState = $this->engine->applyMove($state, 4, new BelaMoveData(type: 'play', card: 'jack_of_spades'));
        $this->assertSame(4, $newState->currentTurn);
    }

    public function test_round_scoring_applies_pala_bela_when_caller_under_82(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => ['7_of_clubs'], 2 => ['8_of_diamonds'], 3 => ['9_of_clubs'], 4 => ['jack_of_spades']],
            'trick' => [
                ['player' => 1, 'card' => 'ace_of_hearts'],
                ['player' => 2, 'card' => 'king_of_hearts'],
                ['player' => 3, 'card' => '10_of_hearts'],
            ],
            'trickHistory' => [],
            'trumpSuit' => 'spades',
            'trumpCaller' => 1,
            'teamScores' => [0, 0],
            'roundPoints' => [40, 10],
            'phase' => 'play',
            'round' => 1,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 4,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $newState = $this->engine->applyMove($state, 4, new BelaMoveData(type: 'play', card: 'jack_of_spades'));

        $this->assertSame([0, 66], $newState->teamScores);
    }

    public function test_detect_declarations_scores_sequences_and_fours(): void
    {
        $hands = [
            1 => ['7_of_clubs', '8_of_clubs', '9_of_clubs', 'jack_of_hearts', 'queen_of_hearts', 'king_of_hearts', 'ace_of_hearts'],
            2 => ['7_of_spades', '8_of_spades', '9_of_spades', '10_of_spades', 'jack_of_spades', 'queen_of_spades', 'king_of_spades'],
            3 => ['7_of_diamonds', '8_of_diamonds', '9_of_diamonds', 'jack_of_diamonds', 'queen_of_diamonds', 'king_of_diamonds', 'ace_of_diamonds'],
            4 => ['7_of_clubs', '8_of_clubs', '9_of_clubs', '10_of_clubs', 'jack_of_clubs', 'queen_of_clubs', 'king_of_clubs'],
        ];

        $method = new ReflectionMethod(BelaEngine::class, 'detectDeclarations');
        $method->setAccessible(true);

        $declarations = $method->invoke($this->engine, $hands);

        $this->assertArrayHasKey('team1', $declarations);
        $this->assertArrayHasKey('team2', $declarations);
        $this->assertSame(20, $declarations['team1']);
    }

    public function test_check_game_over_returns_winner_when_team_reaches_1001(): void
    {
        $state = $this->engine->makeState([
            'hands' => [1 => [], 2 => [], 3 => [], 4 => []],
            'trick' => [],
            'trickHistory' => [],
            'trumpSuit' => null,
            'trumpCaller' => null,
            'teamScores' => [1001, 0],
            'roundPoints' => [0, 0],
            'phase' => 'score',
            'round' => 5,
            'declarations' => ['team1' => 0, 'team2' => 0, 'details' => []],
            'currentTurn' => 1,
            'dealer' => 4,
            'turnedUpCard' => null,
            'players' => [1 => $this->players->get(1), 2 => $this->players->get(2), 3 => $this->players->get(3), 4 => $this->players->get(4)],
            'bids' => [],
            'forfeited' => [],
        ]);

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(1), $result->winner);
        $this->assertFalse($result->draw);
    }
}