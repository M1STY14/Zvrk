<?php

namespace App\Http\Controllers;

use App\Enums\GameStatus;
use App\Events\PlayerJoinedLobby;
use App\Http\Requests\CreateLobbyRequest;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use App\Services\MatchmakingService;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

final class LobbyController extends Controller
{
    public function index(Game $game, #[CurrentUser] User $user): Response
    {
        return Inertia::render('Lobby/Index', [
            'game' => $game,
            'rooms' => $game->waitingRooms(),
            'userRoomId' => $game->userRoomId($user),
        ]);
    }

    public function show(Game $game, GameSession $gameSession): Response
    {
        $gameSession->load([
            'players.user:id,name,avatar',
            'game',
        ]);

        return Inertia::render('Lobby/Show', [
            'game' => $game,
            'session' => $gameSession,
        ]);
    }

    /**
     * @throws Throwable
     */
    public function store(CreateLobbyRequest $request, Game $game, #[CurrentUser] User $user): RedirectResponse
    {
        if ($game->userRoomId($user) !== null) {
            return back()->withErrors(['room' => 'You are already in a room.']);
        }

        $session = DB::transaction(function () use ($game, $request, $user) {
            $session = GameSession::query()->create([
                'game_id' => $game->id,
                'host_user_id' => $user->id,
                'name' => $request->validated('name'),
                'status' => GameStatus::Pending,
                'max_players' => $request->validated('max_players'),
            ]);

            $session->players()->create([
                'user_id' => $user->id,
                'player_number' => 1,
                'joined_at' => now(),
            ]);

            return $session;
        });

        PlayerJoinedLobby::dispatch($game->slug, $user->id, $user->name);

        return redirect()->route('lobby.show', [$game->slug, $session->id]);
    }

    /**
     * @throws Throwable
     */
    public function quickMatch(
        Game $game,
        #[CurrentUser] User $user,
        MatchmakingService $matchmakingService,
    ): RedirectResponse {
        $result = $matchmakingService->quickMatch($game, $user);

        if ($result->started) {
            return redirect()->route('game.show', $result->session->id);
        }

        return redirect()->route('lobby.show', [$game->slug, $result->session->id]);
    }
}
