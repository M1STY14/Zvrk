<?php

namespace Database\Seeders;

use App\Enums\GameType;
use App\Models\Game;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GameSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $games = [
            [
                'slug' => GameType::TicTacToe->value,
                'name' => 'Tic-Tac-Toe',
                'description' => 'Take turns placing Xs and Os on a 3x3 grid. Get three in a row to win!',
                //JUST FOR DEMO TO SEE PICTURE OF GAME ON DASHBOARD
                'image' => '/images/homepage_games_thumbnails/tic_tac_toe_right_side.svg',
                'min_players' => 2,
                'max_players' => 2,
                'is_active' => true,
            ],
            [
                'slug' => GameType::Ludo->value,
                'name' => 'Ludo',
                'description' => 'Roll the dice and race your four tokens from start to finish. Block and capture opponents along the way!',
                'min_players' => 2,
                'max_players' => 4,
                'is_active' => false, // TODO: need to implement game engine
            ],
            [
                'slug' => GameType::Checkers->value,
                'name' => 'Checkers',
                'description' => 'Move your pieces diagonally and jump over opponents to capture them. King your pieces to move in any direction!',
                'min_players' => 2,
                'max_players' => 2,
                'is_active' => false, // TODO: need to implement game engine
            ],
            [
                'slug' => GameType::FourInARow->value,
                'name' => '4 in a Row',
                'description' => 'Drop your colored pieces into a vertical grid. Connect four in a row horizontally, vertically, or diagonally to win!',
                'min_players' => 2,
                'max_players' => 2,
                'is_active' => false, // TODO: need to implement game engine
            ],
        ];

        foreach ($games as $game) {
            Game::query()->updateOrCreate(
                ['slug' => $game['slug']],
                $game,
            );
        }

        $this->command->info("Games have been created!");
    }
}
