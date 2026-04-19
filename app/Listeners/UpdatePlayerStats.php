<?php

namespace App\Listeners;

use App\Events\GameEnded;
use App\Models\GameSession;
use App\Models\PlayerStat;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;

final class UpdatePlayerStats implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(GameEnded $event): void
    {
        $session = GameSession::query()
            ->with('players')
            ->findOrFail($event->sessionId);

        DB::transaction(function () use ($session, $event) {
            foreach ($session->players as $player) {
                $isWinner = ! $event->draw && $player->user_id === $event->winner;

                $stat = PlayerStat::query()->firstOrCreate(
                    [
                        'user_id' => $player->user_id,
                        'game_id' => $session->game_id,
                    ],
                    [
                        'games_played' => 0,
                        'wins' => 0,
                        'losses' => 0,
                        'draws' => 0,
                    ],
                );

                $stat->update([
                    'games_played' => DB::raw('games_played + 1'),
                    'wins' => DB::raw('wins + ' . ($isWinner ? 1 : 0)),
                    'losses' => DB::raw('losses + ' . (! $event->draw && ! $isWinner ? 1 : 0)),
                    'draws' => DB::raw('draws + ' . ($event->draw ? 1 : 0)),
                ]);
            }
        });
    }
}
