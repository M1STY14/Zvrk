<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read string $id
 * @property-read string $game_session_id
 * @property-read string $user_id
 * @property-read int $move_number
 * @property-read array $move_data
 * @property-read Carbon $created_at
 *
 * Relationships
 * @property-read GameSession $gameSession
 * @property-read User $user
 */

final class Move extends Model
{
    use HasUlids;

    const UPDATED_AT = null;

    protected $fillable = [
        'game_session_id',
        'user_id',
        'move_number',
        'move_data',
    ];

    protected function casts(): array
    {
        return [
            'move_data' => 'array',
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
