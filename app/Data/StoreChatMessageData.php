<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Regex;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\StringType;
use Spatie\LaravelData\Data;

final class StoreChatMessageData extends Data
{
    public function __construct(
        #[Required, StringType, Max(250), Regex('/\S/')]
        public string $message,
    ) {
    }

    public static function messages(): array
    {
        return [
            'message.required' => 'Message is required.',
            'message.string' => 'Message must be a string.',
            'message.max' => 'Message cannot exceed 250 characters.',
            'message.regex' => 'Message cannot be blank.',
        ];
    }
}
