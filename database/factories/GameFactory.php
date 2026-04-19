<?php

namespace Database\Factories;

use App\Models\Game;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Game> */
final class GameFactory extends Factory
{
    // TODO: as we add more game, update the game factory
    public function definition(): array
    {
        return [
            'name' => 'Tic Tac Toe',
            'slug' => 'tic-tac-toe',
            'min_players' => 2,
            'max_players' => 2,
            'is_active' => true,
        ];
    }
}
