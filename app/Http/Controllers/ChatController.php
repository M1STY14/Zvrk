<?php

namespace App\Http\Controllers;

use App\Data\StoreChatMessageData;
use App\Events\ChatMessageSent;
use App\Models\ChatMessage;
use App\Models\GameSession;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Http\JsonResponse;

 class ChatController extends Controller
{
    /**
     * @throws AuthorizationException
     */
    public function store(GameSession $gameSession, StoreChatMessageData $data, #[CurrentUser] User $user): JsonResponse
    {
        $this->authorize('chat', $gameSession);

        $chatMessage = ChatMessage::query()->create([
            'game_session_id' => $gameSession->id,
            'user_id' => $user->id,
            'message' => trim($data->message),
        ]);

        $chatMessage->load('user');

        broadcast(new ChatMessageSent(
            sessionId: $gameSession->id,
            messageId: $chatMessage->id,
            message: $chatMessage->message,
            senderId: $chatMessage->user->id,
            senderName: $chatMessage->user->name,
            createdAt: $chatMessage->created_at->toISOString(),
        ))->toOthers();

        return response()->json([
            'id' => $chatMessage->id,
            'message' => $chatMessage->message,
            'sender' => [
                'id' => $chatMessage->user->id,
                'name' => $chatMessage->user->name,
            ],
            'created_at' => $chatMessage->created_at->toISOString(),
        ]);
    }
}
