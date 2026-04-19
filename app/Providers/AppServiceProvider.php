<?php

namespace App\Providers;

use App\Enums\GameType;
use App\Games\TicTacToeEngine;
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
     * @throws BindingResolutionException
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->app->make(GameEngineManager::class)
            ->register(GameType::TicTacToe->value, TicTacToeEngine::class);
    }
}
