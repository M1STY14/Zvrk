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
        User::query()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => Hash::make('testUserPassword'),
            'email_verified_at' => now(),
        ]);

        $this->command->info('Test user created.');

        $this->call([
            GameSeeder::class,
        ]);
    }
}
