<?php

namespace Database\Factories;

use App\Enums\GameStatus;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<GameSession> */
final class GameSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'game_id' => Game::factory(),
            'host_user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'status' => GameStatus::Pending,
            'max_players' => 2,
        ];
    }
}
