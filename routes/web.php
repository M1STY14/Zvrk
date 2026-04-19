<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LobbyController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
})->name('welcome');

Route::get('/o-nama', function () {
    return Inertia::render('AboutUs');
})->name('about');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('/lobby/{game:slug}', [LobbyController::class, 'index'])->name('lobby.index');
    Route::post('/lobby/{game:slug}', [LobbyController::class, 'store'])->name('lobby.store');
    Route::get('/lobby/{game:slug}/{session}', [LobbyController::class, 'show'])->name('lobby.show');
});

require __DIR__.'/auth.php';
