<?php

namespace App\Models;

use App\Enums\GameStatus;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read string $id
 * @property-read string $game_id
 * @property-read string $host_user_id
 * @property-read string $name
 * @property-read GameStatus $status
 * @property-read array|null $state
 * @property-read string|null $winner_user_id
 * @property-read int $max_players
 * @property-read bool $is_private
 * @property-read string|null $invite_code
 * @property-read Carbon|null $started_at
 * @property-read Carbon|null $finished_at
 * @property-read Carbon $created_at
 * @property-read Carbon|null $updated_at
 *
 * Relationships
 * @property-read Game $game
 * @property-read User $host
 * @property-read User $winner
 * @property-read Collection<int, GamePlayer> $players
 * @property-read Collection<int, Move> $moves
 * @property-read Collection<int, ChatMessage> $chatMessages
 */

final class GameSession extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'game_id',
        'host_user_id',
        'name',
        'status',
        'state',
        'winner_user_id',
        'max_players',
        'is_private',
        'invite_code',
        'started_at',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'state' => 'array',
            'status' => GameStatus::class,
            'is_private' => 'boolean',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_user_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_user_id');
    }

    public function players(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }

    public function moves(): HasMany
    {
        return $this->hasMany(Move::class);
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
