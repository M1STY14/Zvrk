<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moves', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('game_session_id')->constrained('game_sessions');
            $table->foreignUlid('user_id')->constrained('users');
            $table->unsignedInteger('move_number');
            $table->json('move_data');
            $table->timestamp('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moves');
    }
};
