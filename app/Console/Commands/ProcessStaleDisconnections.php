<?php

namespace App\Console\Commands;

use App\Enums\GameStatus;
use App\Models\GamePlayer;
use App\Models\GameSession;
use App\Models\User;
use App\Services\GameSessionService;
use Illuminate\Console\Command;

final class ProcessStaleDisconnections extends Command
{
    protected $signature = 'game:process-disconnections';

    protected $description = 'Forfeit active games and close waiting rooms after prolonged disconnects';

    public function handle(GameSessionService $gameSessionService): int
    {
        GamePlayer::query()
            ->where('is_connected', false)
            ->whereNotNull('disconnected_at')
            ->where('disconnected_at', '<=', now()->subSeconds(60))
            ->whereHas('gameSession', fn ($query) => $query->where('status', GameStatus::Playing))
            ->with(['gameSession.game', 'user'])
            ->each(function (GamePlayer $player) use ($gameSessionService) {
                $gameSessionService->forfeitDueToDisconnect($player->gameSession, $player->user);
            });

        GameSession::query()
            ->where('status', GameStatus::Pending)
            ->whereHas('players', function ($query) {
                $query->whereColumn('game_players.user_id', 'game_sessions.host_user_id')
                    ->where('is_connected', false)
                    ->whereNotNull('disconnected_at')
                    ->where('disconnected_at', '<=', now()->subSeconds(60));
            })
            ->with('game')
            ->each(function (GameSession $session) use ($gameSessionService) {
                $host = User::query()->find($session->host_user_id);

                if ($host !== null) {
                    $gameSessionService->abandonPendingRoomByHost($session, $host);
                }
            });

        return self::SUCCESS;
    }
}
