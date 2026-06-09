<?php

namespace App\Events;

use App\Data\GameState;
use App\Enums\GameEndReason;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

final class GameEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $sessionId;

    public ?string $winner;

    public bool $draw;

    public array $state;

    public ?GameEndReason $reason;

    /** @var list<string> User IDs of every player in the session when the game ended. */
    public array $participants;

    /**
     * @param  list<string>  $participants
     */
    public function __construct(
        string $sessionId,
        ?string $winner,
        bool $draw,
        GameState $state,
        ?GameEndReason $reason = null,
        array $participants = [],
    ) {
        $this->sessionId = $sessionId;
        $this->winner = $winner;
        $this->draw = $draw;
        $this->state = $state->toBroadcastArray();
        $this->reason = $reason;
        $this->participants = $participants;
    }

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel("game.{$this->sessionId}");
    }

    public function broadcastAs(): string
    {
        return 'game.ended';
    }

    public function broadcastWith(): array
    {
        return [
            'sessionId' => $this->sessionId,
            'winner' => $this->winner,
            'draw' => $this->draw,
            'state' => $this->state,
            'reason' => $this->reason?->value,
        ];
    }
}
