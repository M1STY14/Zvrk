<?php

namespace App\Services;

use App\Data\QuickMatchResult;
use App\Enums\GameStatus;
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

            if ($session === null) {
                $session = $this->createQuickMatchSession($game, $user);
                $playerCount = 1;
            } else {
                $session->setRelation('game', $game);
                $this->gameSessionService->addPlayer($session, $user);
                $playerCount = $session->players_count + 1;
            }

            $started = $playerCount >= $session->max_players;

            if ($started) {
                $session->load(['players', 'game']);
                $this->gameSessionService->startGame($session);
            }

            return new QuickMatchResult($session, $started);
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

        $session->setRelation('game', $game);
        $this->gameSessionService->addPlayer($session, $user);

        return $session;
    }
}
