<?php

namespace App\Providers;

use App\Events\GameEnded;
use App\Listeners\UpdatePlayerStats;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

final class EventServiceProvider extends ServiceProvider
{
    protected $listen = [
        GameEnded::class => [
            UpdatePlayerStats::class,
        ],
    ];
}
