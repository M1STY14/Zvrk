<?php

namespace App\Services;

use App\Data\QuickMatchResult;
use App\Enums\GameStatus;
use App\Events\PlayerJoinedLobby;
use App\Models\Game;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Throwable;

final readonly class MatchmakingService
{
    public function __construct(
        private GameSessionService $gameSessionService,
    ) {}

    /**
     * @throws Throwable
     */
    public function quickMatch(Game $game, User $user): QuickMatchResult
    {
        return DB::transaction(function () use ($game, $user) {
            Game::query()->whereKey($game->id)->lockForUpdate()->first();

            if ($existingId = $game->userRoomId($user)) {
                $session = GameSession::query()->findOrFail($existingId);

                return new QuickMatchResult(
                    $session,
                    started: $session->status->is(GameStatus::Playing),
                );
            }

            $session = $this->findJoinableSession($game);

            if ($session !== null) {
                $session = $this->joinAvailableSession($session, $user, $game);
            } else {
                $session = $this->createQuickMatchSession($game, $user);
            }

            $session->refresh();
            $playerCount = $session->players()->count();
            $started = false;

            if ($playerCount >= $session->max_players) {
                $session->load(['players', 'game']);
                $this->gameSessionService->startGame($session);
                $started = true;
            }

            return new QuickMatchResult($session->fresh(), $started);
        });
    }

    private function findJoinableSession(Game $game): ?GameSession
    {
        return GameSession::query()
            ->where('game_id', $game->id)
            ->where('status', GameStatus::Pending)
            ->where('is_private', false)
            ->withCount('players')
            ->havingRaw('players_count < max_players')
            ->oldest()
            ->lockForUpdate()
            ->first();
    }

    private function joinAvailableSession(GameSession $session, User $user, Game $game): GameSession
    {
        $session = GameSession::query()->lockForUpdate()->findOrFail($session->id);

        if ($session->players()->count() >= $session->max_players) {
            $nextSession = $this->findJoinableSession($game);

            if ($nextSession !== null) {
                return $this->joinAvailableSession($nextSession, $user, $game);
            }

            return $this->createQuickMatchSession($game, $user);
        }

        if (! $session->has($user)) {
            $this->gameSessionService->addPlayer($session, $user);
        }

        return $session;
    }

    private function createQuickMatchSession(Game $game, User $user): GameSession
    {
        $session = GameSession::query()->create([
            'game_id' => $game->id,
            'host_user_id' => $user->id,
            'name' => 'Quick Match',
            'status' => GameStatus::Pending,
            'max_players' => $game->max_players,
            'is_private' => false,
        ]);

        $session->players()->create([
            'user_id' => $user->id,
            'player_number' => 1,
            'joined_at' => now(),
        ]);

        PlayerJoinedLobby::dispatch($game->slug, $user->id, $user->name);

        return $session;
    }
}
