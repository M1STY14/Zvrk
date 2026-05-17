import { bindGamePresenceHandlers } from '@/lib/presence';
import { useDisconnectedPlayers } from '@/hooks/useDisconnectedPlayers';
import { isPlayerConnected, shouldShowOpponentDisconnectedBanner } from '@/lib/playerConnection';
import type { GameSessionPlayer } from '@/types/gameSession';
import { router } from '@inertiajs/react';
import { useEffect } from 'react';

type Options = {
    gameSlug: string;
    sessionId: string;
    players: GameSessionPlayer[];
    currentUserId: string;
};

/** Presence + disconnect UI for any game waiting room (lobby). */
export function useLobbyGameChannel({ gameSlug, sessionId, players, currentUserId }: Options) {
    const { disconnectedUserIds, onPlayerConnectionChanged } = useDisconnectedPlayers(players);

    const isPlayerDisconnected = (userId: string) => !isPlayerConnected(disconnectedUserIds, userId);

    const showDisconnectedBanner = shouldShowOpponentDisconnectedBanner(
        false,
        currentUserId,
        disconnectedUserIds,
    );

    useEffect(() => {
        const lobbyChannel = `lobby.${gameSlug}`;
        const gameChannel = `game.${sessionId}`;

        window.Echo.join(lobbyChannel)
            .here(() => {})
            .joining(() => {})
            .leaving(() => {})
            .listen('.player.joined.lobby', () => {
                router.reload({ only: ['session'] });
            })
            .listen('.player.left.lobby', () => {
                router.reload({ only: ['session'] });
            })
            .error((err: unknown) => console.error('[lobby] channel error', err));

        const gamePresenceChannel = window.Echo.join(gameChannel);

        bindGamePresenceHandlers(gamePresenceChannel, sessionId, currentUserId, onPlayerConnectionChanged);

        gamePresenceChannel
            .listen('.player.connection.changed', (event: { userId: string; isConnected: boolean }) => {
                onPlayerConnectionChanged(event.userId, event.isConnected);
            })
            .listen('.game.started', () => {
                router.visit(route('game.show', sessionId));
            })
            .listen('.lobby.room.closed', (event: { gameSlug: string }) => {
                router.visit(route('lobby.index', event.gameSlug));
            })
            .error((err: unknown) => console.error('[game] channel error', err));

        return () => {
            window.Echo.leave(lobbyChannel);
            window.Echo.leave(gameChannel);
        };
    }, [gameSlug, sessionId, currentUserId, onPlayerConnectionChanged]);

    return {
        isPlayerDisconnected,
        showDisconnectedBanner,
    };
}
