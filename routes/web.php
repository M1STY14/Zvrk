<?php

use App\Http\Controllers\AboutUsController;
use App\Http\Controllers\WelcomePageController;
use App\Http\Controllers\ChatController;
use Illuminate\Support\Facades\Route;

Route::get('/', WelcomePageController::class)->name('welcome');

Route::get('/o-nama', AboutUsController::class)->name('about');

Route::middleware('auth')->post('/session/{gameSession}/chat', [ChatController::class, 'store']);

require __DIR__.'/auth.php';
require __DIR__.'/user.php';
