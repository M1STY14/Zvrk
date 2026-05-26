export function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function postPresence(
    routeName: 'game.presence.connect' | 'game.presence.disconnect',
    sessionId: string,
): Promise<void> {
    await fetch(route(routeName, [sessionId]), {
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

export function postPresenceConnect(sessionId: string): Promise<void> {
    return postPresence('game.presence.connect', sessionId);
}

export function postPresenceDisconnect(sessionId: string): Promise<void> {
    return postPresence('game.presence.disconnect', sessionId);
}

type PresenceChannel = {
    here: (callback: () => void) => PresenceChannel;
    joining: (callback: (user: { id: string }) => void) => PresenceChannel;
    leaving: (callback: (user: { id: string }) => void) => PresenceChannel;
};

/**
 * Wire presence join/leave callbacks on a game session channel.
 *
 * Each client only ever reports its OWN presence to the server (self-only):
 * we mark ourselves connected when we join and fire a keepalive disconnect
 * beacon on tab close / navigation away. A peer's join/leave only updates the
 * local UI optimistically — the authoritative peer state arrives via the
 * broadcast `player.connection.changed` event.
 *
 * @returns a cleanup function to detach the unload listener and report our own disconnect.
 */
export function bindGamePresenceHandlers(
    channel: PresenceChannel,
    sessionId: string,
    currentUserId: string,
    onLocalConnectionChanged: (userId: string, isConnected: boolean) => void,
): () => void {
    channel.here(() => {
        void postPresenceConnect(sessionId).then(() => {
            onLocalConnectionChanged(currentUserId, true);
        });
    });

    channel.joining((user: { id: string }) => {
        onLocalConnectionChanged(user.id, true);
    });

    channel.leaving((user: { id: string }) => {
        onLocalConnectionChanged(user.id, false);
    });

    const reportSelfDisconnect = () => {
        void postPresenceDisconnect(sessionId);
    };

    window.addEventListener('pagehide', reportSelfDisconnect);

    return () => {
        window.removeEventListener('pagehide', reportSelfDisconnect);
        reportSelfDisconnect();
    };
}
