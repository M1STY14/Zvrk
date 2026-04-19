<?php

namespace App\Http\Controllers;

use App\Data\StoreChatMessageData;
use App\Events\ChatMessageSent;
use App\Models\ChatMessage;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;

class ChatController extends Controller
{
    public function store(GameSession $gameSession, StoreChatMessageData $data): JsonResponse
    {
        $this->authorize('chat', $gameSession);

        $sanitizedMessage = strip_tags($data->message);
        $messageText = trim($sanitizedMessage);

        if ($messageText === '') {
            return response()->json([
                'message' => 'Message cannot be empty.',
            ], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var \App\Models\User $user */
        $user = auth()->user();

        $chatMessage = ChatMessage::query()->create([
            'game_session_id' => $gameSession->id,
            'user_id' => $user->id,
            'message' => $messageText,
        ]);

        $chatMessage->load('user');

        broadcast(new ChatMessageSent(
            sessionId: (string) $gameSession->id,
            messageId: (string) $chatMessage->id,
            message: $chatMessage->message,
            senderId: (string) $chatMessage->user->id,
            senderName: $chatMessage->user->name,
            createdAt: $chatMessage->created_at?->toISOString() ?? now()->toISOString(),
        ))->toOthers();

        return response()->json([
            'id' => $chatMessage->id,
            'message' => $chatMessage->message,
            'sender' => [
                'id' => $chatMessage->user->id,
                'name' => $chatMessage->user->name,
            ],
            'created_at' => $chatMessage->created_at?->toISOString(),
        ]);
    }
}
