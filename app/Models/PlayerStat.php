<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read string $id
 * @property-read string $user_id
 * @property-read string $game_id
 * @property-read int $games_played
 * @property-read int $wins
 * @property-read int $losses
 * @property-read int $draws
 * @property-read Carbon $created_at
 * @property-read Carbon|null $updated_at
 *
 * Relationships
 * @property-read User $user
 * @property-read Game $game
 */

final class PlayerStat extends Model
{
    use HasUlids;

    protected $fillable = [
        'user_id',
        'game_id',
        'games_played',
        'wins',
        'losses',
        'draws',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}
