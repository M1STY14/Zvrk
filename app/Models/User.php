<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property-read string $id
 * @property-read string $name
 * @property-read string $email
 * @property-read Carbon|null $email_verified_at
 * @property-read string $password
 * @property-read string|null $avatar
 * @property-read string $remember_token
 * @property-read Carbon $created_at
 * @property-read Carbon|null $updated_at
 *
 * Relationships
 * @property-read Collection<int, PlayerStat> $stats
 * @property-read Collection<int, GameSession> $gameSession
 */

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasUlids, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function playerStats(): HasMany
    {
        return $this->hasMany(PlayerStat::class);
    }

    public function gameSessions(): BelongsToMany
    {
        return $this->belongsToMany(GameSession::class, 'game_players')
            ->using(GamePlayer::class)
            ->withPivot('player_number', 'is_connected', 'joined_at');
    }

    public function totalGamesPlayed(): int
    {
        return (int) $this->stats->sum('games_played');
    }

    public function totalWins(): int
    {
        return (int) $this->stats->sum('wins');
    }

    public function overallWinRate(): float
    {
        $played = $this->totalGamesPlayed();

        return $played > 0 ? round(($this->totalWins() / $played) * 100, 1) : 0.0;
    }
}
