<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

/**
 * @property-read string $id
 * @property-read string $game_session_id
 * @property-read string $user_id
 * @property-read int $player_number
 * @property-read bool $is_connected
 * @property-read Carbon $joined_at
 *
 * Relationships
 * @property-read GameSession $gameSession
 * @property-read User $user
 */
final class GamePlayer extends Model
{
    use HasUlids;

    public $timestamps = false;

    protected $fillable = [
        'game_session_id',
        'user_id',
        'player_number',
        'is_connected',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'is_connected' => 'boolean',
            'joined_at' => 'datetime',
        ];
    }

    public function gameSession(): BelongsTo
    {
        return $this->belongsTo(GameSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
