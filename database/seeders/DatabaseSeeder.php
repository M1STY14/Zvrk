<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            ['name' => 'Leo', 'email' => 'leo@zvrk.hr'],
            ['name' => 'Fran', 'email' => 'fran@zvrk.hr'],
            ['name' => 'Nicole', 'email' => 'nicole@zvrk.hr'],
            ['name' => 'Barbara', 'email' => 'barbara@zvrk.hr'],
            ['name' => 'Filipovic', 'email' => 'filipovic@zvrk.hr'],
            ['name' => 'Veselic', 'email' => 'veselic@zvrk.hr'],
        ];

        foreach ($users as $user) {
            User::query()->create([
                'name' => $user['name'],
                'email' => $user['email'],
                'password' => Hash::make('testUserPassword'),
                'email_verified_at' => now(),
            ]);
        }

        $this->command->info('Test users created.');

        $this->call([
            GameSeeder::class,
        ]);
    }
}
