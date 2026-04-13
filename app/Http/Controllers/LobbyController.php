<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Events\PlayerJoinedLobby;
use App\Http\Requests\CreateLobbyRequest;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

final class LobbyController extends Controller
{
    public function index(Game $game): Response
    {
        $rooms = $game->gameSessions()
            ->where('status', GameStatus::Waiting)
            ->where('is_private', false)
            ->withCount('players')
            ->with('host:id,name')
            ->latest()
            ->get();

        return Inertia::render('Lobby/Index', [
            'game' => $game,
            'rooms' => $rooms,
        ]);
    }

    public function show(Game $game, GameSession $session): Response
    {
        $session->load([
            'players.user:id,name,avatar',
            'game'
        ]);

        return Inertia::render('Lobby/Show', [
            'game' => $game,
            'session' => $session,
        ]);
    }

    public function store(CreateLobbyRequest $request, Game $game, #[CurrentUser] User $user): RedirectResponse
    {
        $session = GameSession::query()->create([
            'game_id' => $game->id,
            'host_user_id' => $user->id,
            'name' => $request->validated('name'),
            'status' => GameStatus::Waiting,
            'max_players' => $request->validated('max_players'),
        ]);

        $session->players()->create([
            'user_id' => $user->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        PlayerJoinedLobby::dispatch($game->slug, $user->id, $user->name);

        return to_route('lobby.show', [$game->slug, $session->id]);
    }
}
