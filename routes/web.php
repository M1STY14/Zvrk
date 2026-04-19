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

require __DIR__.'/auth.php';
require __DIR__.'/user.php';
