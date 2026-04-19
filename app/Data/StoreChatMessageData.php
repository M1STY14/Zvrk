<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

final class StoreChatMessageData extends Data
{
    public function __construct(
        #[Required, StringType, Max(1000)]
        public string $message,
    ) {
    }
}
