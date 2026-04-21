<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\GameSessionController;
use App\Http\Middleware\EnsurePlayerInGame;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/session/{gameSession}/join', [GameSessionController::class, 'join'])->name('game.join');

    Route::middleware(EnsurePlayerInGame::class)->group(function () {
        Route::get('/session/{gameSession}', [GameSessionController::class, 'show'])->name('game.show');
        Route::post('/session/{gameSession}/start', [GameSessionController::class, 'start'])->name('game.start');
        Route::post('/session/{gameSession}/start-vs-ai', [GameSessionController::class, 'startWithAi'])->name('game.start-vs-ai');
        Route::post('/session/{gameSession}/close-room', [GameSessionController::class, 'closeRoom'])->name('game.close-room');
        Route::post('/session/{gameSession}/move', [GameSessionController::class, 'move'])->name('game.move');
        Route::post('/session/{gameSession}/leave', [GameSessionController::class, 'leave'])->name('game.leave');
        Route::post('/session/{gameSession}/chat', ChatController::class);
    });
});
