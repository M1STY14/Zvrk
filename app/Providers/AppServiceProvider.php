<?php

namespace App\Providers;

use App\Enums\GameType;
use App\Games\Checkers\CheckersEngine;
use App\Games\ConnectFourEngine;
use App\Games\Ludo\LudoEngine;
use App\Games\Snaps\SnapsEngine;
use App\Games\TicTacToeEngine;
use App\Games\Uno\UnoEngine;
use App\Services\GameEngineManager;
use Illuminate\Contracts\Container\BindingResolutionException;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(GameEngineManager::class);
    }

    /**
     * Bootstrap any application services.
     *
     * @throws BindingResolutionException
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $manager = $this->app->make(GameEngineManager::class);
        $manager->register(GameType::TicTacToe->value, TicTacToeEngine::class);
        $manager->register(GameType::Ludo->value, LudoEngine::class);
        $manager->register(GameType::Checkers->value, CheckersEngine::class);
        $manager->register(GameType::FourInARow->value, ConnectFourEngine::class);
        $manager->register(GameType::Uno->value, UnoEngine::class);
        $manager->register(GameType::Snaps->value, SnapsEngine::class);
    }
}
