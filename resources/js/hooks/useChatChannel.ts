import { useEffect } from 'react';

type ChatMessage = {
    id: string;
    message: string;
    sender: {
        id: string;
        name: string;
    };
    created_at: string;
};

export function useChatChannel(
    sessionId: string,
    onMessageReceived: (message: ChatMessage) => void
) {
    useEffect(() => {
        const channelName = `game.${sessionId}.chat`;

        window.Echo
            .private(channelName)
            .listen('.chat.message.sent', (event: ChatMessage) => {
                onMessageReceived(event);
            });

        return () => {
            window.Echo.leave(`private-${channelName}`);
        };
    }, [sessionId, onMessageReceived]);
}
