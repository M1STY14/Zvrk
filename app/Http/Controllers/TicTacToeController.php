<?php

namespace App\Http\Controllers;

use App\Games\TicTacToeEngine;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

final class TicTacToeController extends Controller
{
    public function __invoke(): Response
    {
        $engine = new TicTacToeEngine();
        $players = collect([
            Auth::check() ? Auth::user()->name : 'Igrač 1',
            'Igrač 2',
        ]);

        $state = $engine->initialState($players);

        return Inertia::render('Games/TicTacToe', [
            'initialState' => [
                'board' => $state->board,
                'currentTurn' => $state->currentTurn,
                'players' => $state->players->all(),
            ],
        ]);
    }
}
