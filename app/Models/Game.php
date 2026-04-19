<?php

namespace App\Models;

use Carbon\Carbon;
use App\Enums\GameStatus;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read string $id
 * @property-read string $name
 * @property-read string $slug
 * @property-read string|null $description
 * @property-read int $min_players
 * @property-read int $max_players
 * @property-read string|null $image
 * @property-read bool $is_active
 * @property-read Carbon $created_at
 * @property-read Carbon|null $updated_at
 *
 * Relationships
 * @property-read Collection<int, GameSession> $gameSessions
 * @property-read Collection<int, PlayerStat> $playerStats
 */

final class Game extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'min_players',
        'max_players',
        'image',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function gameSessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }

    public function playerStats(): HasMany
    {
        return $this->hasMany(PlayerStat::class);
    }

    public function waitingRooms(): Collection
    {
        return $this->gameSessions()
            ->where('status', GameStatus::Pending)
            ->where('is_private', false)
            ->withCount('players')
            ->with('host:id,name')
            ->latest()
            ->get();
    }

    public function userRoomId(User $user): ?string
    {
        return $this->gameSessions()
            ->where('status', GameStatus::Pending)
            ->whereHas('players', fn ($query) => $query->where('user_id', $user->id))
            ->value('id');
    }
}
