<?php

namespace Tests\Unit;

use App\Data\BattleshipMoveData;
use App\Data\BattleshipState;
use App\Data\Ship;
use App\Data\ShipPlacement;
use App\Enums\BattleshipAction;
use App\Enums\BattleshipOrientation;
use App\Enums\BattleshipPhase;
use App\Enums\BattleshipShip;
use App\Games\Battleship\BattleshipEngine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class BattleshipEngineTest extends TestCase
{
    use RefreshDatabase;

    private BattleshipEngine $engine;

    private Collection $players;

    protected function setUp(): void
    {
        parent::setUp();

        $this->engine = new BattleshipEngine;
        $this->players = collect([
            BattleshipState::PLAYER_ONE => User::factory()->create()->id,
            BattleshipState::PLAYER_TWO => User::factory()->create()->id,
        ]);
    }

    private function place(BattleshipShip $ship, int $row, int $col, BattleshipOrientation $orientation = BattleshipOrientation::Horizontal): ShipPlacement
    {
        return new ShipPlacement(ship: $ship, row: $row, col: $col, orientation: $orientation);
    }

    /**
     * A valid, non-overlapping standard fleet laid out one ship per row.
     *
     * @return Collection<int, ShipPlacement>
     */
    private function fleetLayout(): Collection
    {
        return collect([
            $this->place(BattleshipShip::Carrier, 0, 0),
            $this->place(BattleshipShip::Battleship, 1, 0),
            $this->place(BattleshipShip::Cruiser, 2, 0),
            $this->place(BattleshipShip::Submarine, 3, 0),
            $this->place(BattleshipShip::Destroyer, 4, 0),
        ]);
    }

    private function placementState(): BattleshipState
    {
        // initialState consumes a 0-indexed list (mirrors pluck('user_id')).
        return $this->engine->initialState($this->players->values());
    }

    /**
     * A state already in the attack phase with both fleets placed identically.
     */
    private function attackState(int $currentTurn = BattleshipState::PLAYER_ONE): BattleshipState
    {
        $state = $this->placementState();

        foreach ([BattleshipState::PLAYER_ONE, BattleshipState::PLAYER_TWO] as $playerNumber) {
            $state = $this->engine->applyMove($state, $playerNumber, new BattleshipMoveData(
                action: BattleshipAction::PlaceFleet,
                ships: $this->fleetLayout(),
            ));
        }

        $this->assertSame(BattleshipPhase::Attack, $state->phase);

        return $state->copyWith(currentTurn: $currentTurn);
    }

    private function fire(BattleshipState $state, int $attacker, int $row, int $col): BattleshipState
    {
        return $this->engine->applyMove($state, $attacker, new BattleshipMoveData(action: BattleshipAction::Attack, row: $row, col: $col));
    }

    public function test_initial_state_starts_in_placement_phase(): void
    {
        $state = $this->placementState();

        $this->assertInstanceOf(BattleshipState::class, $state);
        $this->assertSame(BattleshipPhase::Placement, $state->phase);
        $this->assertFalse($state->board(BattleshipState::PLAYER_ONE)->ready);
        $this->assertTrue($state->board(BattleshipState::PLAYER_ONE)->ships->isEmpty());
    }

    public function test_valid_ship_placement_is_accepted(): void
    {
        $state = $this->placementState();
        $move = new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 0, orientation: BattleshipOrientation::Horizontal);

        $this->assertTrue($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, $move));
    }

    public function test_placement_out_of_bounds_is_rejected(): void
    {
        $state = $this->placementState();
        // Carrier length 5 starting at col 6 would run off the 10-wide grid.
        $move = new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 6, orientation: BattleshipOrientation::Horizontal);

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, $move));
    }

    public function test_overlapping_ships_are_rejected(): void
    {
        $state = $this->placementState();
        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 0, orientation: BattleshipOrientation::Horizontal));

        // Battleship vertical at (0,0) overlaps the carrier's first cell.
        $overlap = new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Battleship, row: 0, col: 0, orientation: BattleshipOrientation::Vertical);

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, $overlap));
    }

    public function test_replacing_same_ship_does_not_count_as_overlap(): void
    {
        $state = $this->placementState();
        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 0, orientation: BattleshipOrientation::Horizontal));

        $reposition = new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 0, orientation: BattleshipOrientation::Vertical);

        $this->assertTrue($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, $reposition));

        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_ONE, $reposition);
        $this->assertCount(1, $state->board(BattleshipState::PLAYER_ONE)->ships);
    }

    public function test_ready_requires_full_fleet(): void
    {
        $state = $this->placementState();
        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::Place, ship: BattleshipShip::Carrier, row: 0, col: 0, orientation: BattleshipOrientation::Horizontal));

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::Ready)));
    }

    public function test_invalid_fleet_with_missing_ship_is_rejected(): void
    {
        $state = $this->placementState();
        $partial = $this->fleetLayout()->take(4)->values();

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::PlaceFleet, ships: $partial)));
    }

    public function test_game_enters_attack_phase_when_both_players_ready(): void
    {
        $state = $this->placementState();

        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::PlaceFleet, ships: $this->fleetLayout()));
        $this->assertSame(BattleshipPhase::Placement, $state->phase, 'Still placement until both confirm.');
        $this->assertTrue($state->board(BattleshipState::PLAYER_ONE)->ready);

        $state = $this->engine->applyMove($state, BattleshipState::PLAYER_TWO, new BattleshipMoveData(action: BattleshipAction::PlaceFleet, ships: $this->fleetLayout()));
        $this->assertSame(BattleshipPhase::Attack, $state->phase);
        $this->assertSame(BattleshipState::PLAYER_ONE, $state->currentTurn);
    }

    public function test_attack_registers_a_hit(): void
    {
        $state = $this->attackState();
        // Player 1 fires at (0,0) which holds player 2's carrier.
        $state = $this->fire($state, BattleshipState::PLAYER_ONE, 0, 0);

        $attack = $state->board(BattleshipState::PLAYER_TWO)->attacks->first();
        $this->assertTrue($attack->hit);
        $this->assertSame(BattleshipState::PLAYER_TWO, $state->currentTurn, 'Turn alternates after a hit.');
    }

    public function test_attack_registers_a_miss(): void
    {
        $state = $this->attackState();
        // Row 9 is empty in our layout.
        $state = $this->fire($state, BattleshipState::PLAYER_ONE, 9, 9);

        $this->assertFalse($state->board(BattleshipState::PLAYER_TWO)->attacks->first()->hit);
        $this->assertSame(BattleshipState::PLAYER_TWO, $state->currentTurn);
    }

    public function test_attacking_same_cell_twice_is_rejected(): void
    {
        $state = $this->attackState();
        $state = $this->fire($state, BattleshipState::PLAYER_ONE, 0, 0);

        // Back to player 1's turn for the repeat check.
        $state = $state->copyWith(currentTurn: BattleshipState::PLAYER_ONE);

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_ONE, new BattleshipMoveData(action: BattleshipAction::Attack, row: 0, col: 0)));
    }

    public function test_attacking_out_of_turn_is_rejected(): void
    {
        $state = $this->attackState();

        $this->assertFalse($this->engine->validateMove($state, BattleshipState::PLAYER_TWO, new BattleshipMoveData(action: BattleshipAction::Attack, row: 5, col: 5)));
    }

    public function test_sinking_a_ship_is_reflected_in_the_public_view(): void
    {
        $state = $this->attackState();

        // Destroyer (length 2) sits at row 4, cols 0-1 on player 2's board.
        $state = $this->sinkCells($state, attacker: BattleshipState::PLAYER_ONE, cells: [[4, 0], [4, 1]]);

        $view = $state->stateForPlayer(BattleshipState::PLAYER_ONE);
        $destroyer = collect($view['boards'][BattleshipState::PLAYER_TWO]['fleet'])->firstWhere('name', BattleshipShip::Destroyer->value);

        $this->assertTrue($destroyer['sunk']);
        $this->assertContains(['row' => 4, 'col' => 0], $view['boards'][BattleshipState::PLAYER_TWO]['sunkCells']);
    }

    public function test_game_over_when_entire_fleet_is_sunk(): void
    {
        $state = $this->attackState();

        $allCells = $state->board(BattleshipState::PLAYER_TWO)->ships
            ->flatMap(fn (Ship $ship) => $ship->cells->map(fn ($cell) => [$cell->row, $cell->col]))
            ->all();

        $state = $this->sinkCells($state, attacker: BattleshipState::PLAYER_ONE, cells: $allCells);

        $result = $this->engine->checkGameOver($state);

        $this->assertNotNull($result);
        $this->assertSame($this->players->get(BattleshipState::PLAYER_ONE), $result->winner);
        $this->assertFalse($result->draw);
    }

    public function test_game_not_over_while_ships_remain(): void
    {
        $state = $this->attackState();
        $state = $this->fire($state, BattleshipState::PLAYER_ONE, 0, 0);

        $this->assertNull($this->engine->checkGameOver($state));
    }

    public function test_player_cannot_see_opponent_ship_positions(): void
    {
        $state = $this->attackState();

        $playerOneView = $state->stateForPlayer(BattleshipState::PLAYER_ONE);

        // Player 1 sees their own ships...
        $this->assertNotEmpty($playerOneView['boards'][BattleshipState::PLAYER_ONE]['ships']);
        // ...but never the opponent's ship cells.
        $this->assertArrayNotHasKey('ships', $playerOneView['boards'][BattleshipState::PLAYER_TWO]);
    }

    public function test_broadcast_array_hides_both_fleets(): void
    {
        $state = $this->attackState();

        $broadcast = $state->toBroadcastArray();

        $this->assertArrayNotHasKey('ships', $broadcast['boards'][BattleshipState::PLAYER_ONE]);
        $this->assertArrayNotHasKey('ships', $broadcast['boards'][BattleshipState::PLAYER_TWO]);
    }

    public function test_state_survives_array_round_trip(): void
    {
        // The service persists toArray() and rebuilds via makeState() on every move.
        $original = $this->attackState();
        $original = $this->fire($original, BattleshipState::PLAYER_ONE, 0, 0);

        $restored = $this->engine->makeState($original->toArray());

        $this->assertInstanceOf(BattleshipState::class, $restored);
        $this->assertEquals($original->phase, $restored->phase);
        $this->assertEquals($original->currentTurn, $restored->currentTurn);
        $this->assertEquals($original->players->all(), $restored->players->all());
        $this->assertSame(
            $original->board(BattleshipState::PLAYER_TWO)->totalShipCells(),
            $restored->board(BattleshipState::PLAYER_TWO)->totalShipCells(),
        );
        $this->assertTrue($restored->board(BattleshipState::PLAYER_TWO)->attacks->first()->hit);
    }

    /**
     * Fire a sequence of (row, col) shots from `attacker`, re-setting the turn each
     * time so the helper isn't blocked by alternation.
     *
     * @param  array<int, array{0: int, 1: int}>  $cells
     */
    private function sinkCells(BattleshipState $state, int $attacker, array $cells): BattleshipState
    {
        foreach ($cells as [$row, $col]) {
            $state = $this->fire($state->copyWith(currentTurn: $attacker), $attacker, $row, $col);
        }

        return $state;
    }
}
