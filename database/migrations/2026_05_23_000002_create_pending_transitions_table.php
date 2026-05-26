<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pending_transitions', function (Blueprint $table): void {
            $table->id();

            $table->ulidMorphs('model');
            $table->string('field');

            $table->string('from')->nullable();
            $table->string('to')->nullable();

            $table->json('custom_properties')->nullable();
            $table->nullableUlidMorphs('responsible');

            $table->dateTime('transition_at');
            $table->dateTime('applied_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pending_transitions');
    }
};
