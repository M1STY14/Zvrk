<?php

namespace App\Enums;

use App\CompareEnumTrait;

/**
 * Why a game session ended. Persisted on the session row and broadcast with GameEnded.
 *
 * @property-read string $value
 * @property-read string $name
 */
enum GameEndReason: string
{
    use CompareEnumTrait;

    /** A player dropped and did not reconnect within the grace period. */
    case Disconnect = 'disconnect';

    /** A player manually left an in-progress game. */
    case PlayerLeft = 'player_left';

    /** The host dropped out of a pending lobby. */
    case HostLeft = 'host_left';

    /** The host closed the waiting room before the game started. */
    case RoomClosed = 'room_closed';
}
