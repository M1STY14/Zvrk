<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read string $id
 * @property-read string $game_session_id
 * @property-read string $user_id
 * @property-read string $message
 * @property-read Carbon $created_at
 *
 * Relationships
 * @property-read Collection<int, GameSession> $gameSessions
 * @property-read User $user
 */

final class ChatMessage extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'game_session_id',
        'user_id',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
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
