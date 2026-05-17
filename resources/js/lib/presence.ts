export function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function postPresence(
    routeName: 'game.presence.connect' | 'game.presence.disconnect',
    sessionId: string,
    userId: string,
): Promise<void> {
    await fetch(route(routeName, [sessionId, userId]), {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
        },
    });
}

export function postPresenceConnect(sessionId: string, userId: string): Promise<void> {
    return postPresence('game.presence.connect', sessionId, userId);
}

export function postPresenceDisconnect(sessionId: string, userId: string): Promise<void> {
    return postPresence('game.presence.disconnect', sessionId, userId);
}

type PresenceChannel = {
    here: (callback: () => void) => PresenceChannel;
    joining: (callback: (user: { id: string }) => void) => PresenceChannel;
    leaving: (callback: (user: { id: string }) => void) => PresenceChannel;
};

/** Wire presence join/leave callbacks on a game session channel. */
export function bindGamePresenceHandlers(
    channel: PresenceChannel,
    sessionId: string,
    currentUserId: string,
    onLocalConnectionChanged: (userId: string, isConnected: boolean) => void,
): void {
    const markConnected = (userId: string) => {
        void postPresenceConnect(sessionId, userId).then(() => {
            onLocalConnectionChanged(userId, true);
        });
    };

    const markDisconnected = (userId: string) => {
        void postPresenceDisconnect(sessionId, userId);
    };

    channel.here(() => {
        markConnected(currentUserId);
    });

    channel.joining((user: { id: string }) => {
        markConnected(user.id);
    });

    channel.leaving((user: { id: string }) => {
        markDisconnected(user.id);
    });
}
