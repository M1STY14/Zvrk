<?php

namespace App\Listeners;

use App\Events\GameEnded;
use App\Models\GameSession;
use App\Models\PlayerStat;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

final class UpdatePlayerStats implements ShouldQueue
{
    use InteractsWithQueue;

    public function handle(GameEnded $event): void
    {
        $session = GameSession::query()
            ->with('players')
            ->findOrFail($event->sessionId);

        foreach ($session->players as $player) {
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

            $stat->increment('games_played');

            if ($event->draw) {
                $stat->increment('draws');
                continue;
            }

            if ($player->user_id === $event->winner) {
                $stat->increment('wins');
            } else {
                $stat->increment('losses');
            }
        }
    }
}
