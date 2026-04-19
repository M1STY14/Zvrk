<?php

use App\Http\Controllers\AboutUsController;
use App\Http\Controllers\TicTacToeController;
use App\Http\Controllers\WelcomePageController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomePageController::class)->name('welcome');
Route::get('/tic-tac-toe', TicTacToeController::class)->name('tic-tac-toe');

Route::get('/o-nama', AboutUsController::class)->name('about');

require __DIR__.'/auth.php';
require __DIR__.'/user.php';
