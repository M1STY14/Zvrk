<?php

namespace App\Services;

use App\Contracts\GameContract;
use Illuminate\Support\Collection;
use InvalidArgumentException;

final class GameEngineManager
{
    /** @var Collection<string, class-string<GameContract>> */
    private Collection $engines;

    /** @param array<string, class-string<GameContract>> $engines */
    public function __construct(array $engines = [])
    {
        $this->engines = collect($engines);
    }

    public function register(string $slug, string $engineClass): void
    {
        $this->engines->put($slug, $engineClass);
    }

    public function resolve(string $slug): GameContract
    {
        $engineClass = $this->engines->get($slug);

        if ($engineClass === null) {
            throw new InvalidArgumentException("No game engine registered for slug [{$slug}].");
        }

        return new $engineClass();
    }
}
