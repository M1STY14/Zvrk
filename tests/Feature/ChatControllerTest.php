<?php

namespace Tests\Feature;

use App\Events\ChatMessageSent;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChatControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_host_can_send_chat_message(): void
    {
        $this->withoutExceptionHandling();
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", [
            'message' => 'hello world',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'hello world',
                'sender' => [
                    'id' => $host->id,
                    'name' => $host->name,
                ],
            ])
            ->assertJsonStructure([
                'id',
                'message',
                'sender' => [
                    'id',
                    'name',
                ],
                'created_at',
            ]);

        $this->assertDatabaseHas('chat_messages', [
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'message' => 'hello world',
        ]);

        Event::assertDispatched(ChatMessageSent::class);
    }

    public function test_joined_player_can_send_chat_message(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $player = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        GamePlayer::query()->create([
            'game_session_id' => $session->id,
            'user_id' => $player->id,
            'player_number' => 2,
            'is_connected' => true,
            'joined_at' => now(),
        ]);

        $response = $this->actingAs($player)->postJson("/session/$session->id/chat", [
            'message' => 'hi from player 2',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'hi from player 2',
                'sender' => [
                    'id' => $player->id,
                    'name' => $player->name,
                ],
            ]);

        $this->assertDatabaseHas('chat_messages', [
            'game_session_id' => $session->id,
            'user_id' => $player->id,
            'message' => 'hi from player 2',
        ]);

        Event::assertDispatched(ChatMessageSent::class);
    }

    public function test_non_participant_cannot_send_chat_message(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $intruder = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($intruder)->postJson("/session/$session->id/chat", [
            'message' => 'let me in',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseEmpty('chat_messages');

        Event::assertNotDispatched(ChatMessageSent::class);
    }

    public function test_empty_message_cannot_be_sent(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", [
            'message' => '   ',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'message' => 'Message is required.',
            ]);

        $this->assertDatabaseEmpty('chat_messages');

        Event::assertNotDispatched(ChatMessageSent::class);
    }

    public function test_message_html_is_stored_verbatim(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $raw = '<script>alert(1)</script><b>Hello</b>';

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", [
            'message' => $raw,
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => $raw,
                'sender' => [
                    'id' => $host->id,
                    'name' => $host->name,
                ],
            ]);

        $this->assertDatabaseHas('chat_messages', [
            'game_session_id' => $session->id,
            'user_id' => $host->id,
            'message' => $raw,
        ]);

        Event::assertDispatched(ChatMessageSent::class);
    }

    public function test_message_is_required(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", []);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'message',
            ]);

        $this->assertDatabaseEmpty('chat_messages');

        Event::assertNotDispatched(ChatMessageSent::class);
    }

    public function test_message_must_be_a_string(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", [
            'message' => ['not', 'a', 'string'],
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'message',
            ]);

        $this->assertDatabaseEmpty('chat_messages');

        Event::assertNotDispatched(ChatMessageSent::class);
    }

    public function test_message_cannot_exceed_max_length(): void
    {
        Event::fake();

        $host = User::factory()->create();
        $game = Game::factory()->create();

        $session = GameSession::factory()->create([
            'game_id' => $game->id,
            'host_user_id' => $host->id,
        ]);

        $response = $this->actingAs($host)->postJson("/session/$session->id/chat", [
            'message' => str_repeat('a', 251),
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'message',
            ]);

        $this->assertDatabaseEmpty('chat_messages');

        Event::assertNotDispatched(ChatMessageSent::class);
    }
}
