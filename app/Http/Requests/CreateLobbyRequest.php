<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CreateLobbyRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        $game = $this->route('game');

        return [
            'name' => ['required', 'string', 'max:255'],
            'max_players' => ['required', 'integer', "min:{$game->min_players}", "max:{$game->max_players}"],
        ];
    }
}
