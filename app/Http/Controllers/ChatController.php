<?php

namespace App\Http\Controllers;

use App\Events\ChatMessageSent;
use App\Models\ChatMessage;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ChatController extends Controller
{
    public function store(Request $request, GameSession $gameSession): JsonResponse
    {
        $user = $request->user();

        $isHost = $gameSession->host_user_id == $user->id;
        $isPlayer = $gameSession->players()->where('user_id', $user->id)->exists();

        abort_unless($isHost || $isPlayer, Response::HTTP_FORBIDDEN);

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $messageText = trim(strip_tags($validated['message']));

        if($messageText === '') {
            return response()->json(['message' => 'Message cannot be empty.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $chatMessage = ChatMessage::create([
            'game_session_id' => $gameSession->id,
            'user_id' => $user->id,
            'message' => $messageText,
        ]);

        $chatMessage->load('user');

        broadcast(new ChatMessageSent(
            sessionId: $gameSession->id,
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
