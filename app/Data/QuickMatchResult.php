<?php

namespace App\Data;

use App\Models\GameSession;

final readonly class QuickMatchResult
{
    public function __construct(
        public GameSession $session,
        public bool $started,
    ) {}
}
