<?php

use App\Enums\GameStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_sessions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('game_id')->constrained('games');
            $table->foreignUlid('host_user_id')->constrained('users');
            $table->string('name');
            $table->string('status')->default(GameStatus::Waiting->value);
            $table->json('state')->nullable();
            $table->foreignUlid('winner_user_id')->nullable()->constrained('users');
            $table->unsignedTinyInteger('max_players');
            $table->boolean('is_private')->default(false);
            $table->string('invite_code')->nullable()->unique();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_sessions');
    }
};
