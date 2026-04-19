<?php

namespace Database\Seeders;

use App\Models\Game;
use App\Models\PlayerStat;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PlayerStatSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $users = User::query()->get();
        $games = Game::query()->get();

        if ($users->isEmpty() || $games->isEmpty()) {
            $this->command->warn('PlayerStatSeeder skipped: users or games table is empty.');

            return;
        }

        foreach ($users as $user) {
            foreach ($games as $game) {
                $wins = random_int(0, 12);
                $losses = random_int(0, 10);
                $draws = random_int(0, 4);

                PlayerStat::query()->updateOrCreate(
                    ['user_id' => $user->id, 'game_id' => $game->id],
                    [
                        'games_played' => $wins + $losses + $draws,
                        'wins' => $wins,
                        'losses' => $losses,
                        'draws' => $draws,
                    ],
                );
            }
        }

        $this->command->info('Player stats have been created!');
    }
}
