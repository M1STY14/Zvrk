<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AboutUsController;
use App\Http\Controllers\WelcomePageController;
use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomePageController::class)->name('welcome');

Route::get('/o-nama', AboutUsController::class)->name('about');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/lobby/{game:slug}', [LobbyController::class, 'index'])->name('lobby.index');
    Route::post('/lobby/{game:slug}', [LobbyController::class, 'store'])->name('lobby.store');
    Route::get('/lobby/{game:slug}/{session}', [LobbyController::class, 'show'])->name('lobby.show');
});

Route::middleware('auth')->post('/session/{gameSession}/chat', [ChatController::class, 'store']);

require __DIR__.'/auth.php';
require __DIR__.'/user.php';
