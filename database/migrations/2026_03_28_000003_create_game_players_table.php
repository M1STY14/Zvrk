<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_players', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('game_session_id')->constrained('game_sessions');
            $table->foreignUlid('user_id')->constrained('users');
            $table->unsignedTinyInteger('player_number');
            $table->boolean('is_connected')->default(true);
            $table->timestamp('joined_at');

            $table->unique(['game_session_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_players');
    }
};
