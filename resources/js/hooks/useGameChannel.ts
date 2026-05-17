import { bindGamePresenceHandlers } from '@/lib/presence';
import { useDisconnectedPlayers } from '@/hooks/useDisconnectedPlayers';
import {
    hasMultipleHumanOpponents,
    isPlayerConnected,
    shouldShowOpponentDisconnectedBanner,
} from '@/lib/playerConnection';
import type { GameSessionPlayer } from '@/types/gameSession';
import { useEffect, useRef } from 'react';

export type MoveMadeEvent<TState> = {
    sessionId: string;
    playerId: string;
    nextPlayerId: string | null;
    state: TState;
};

export type GameStartedEvent<TState> = {
    sessionId: string;
    startingPlayerId: string;
    state: TState;
};

export type GameEndedEvent<TState> = {
    sessionId: string;
    winner: string | null;
    draw: boolean;
    state: TState;
    reason?: string | null;
};

export type PlayerConnectionChangedEvent = {
    sessionId: string;
    userId: string;
    isConnected: boolean;
};

export type GameChannelHandlers<TState> = {
    onMoveMade?: (event: MoveMadeEvent<TState>) => void;
    onGameStarted?: (event: GameStartedEvent<TState>) => void;
    onGameEnded?: (event: GameEndedEvent<TState>) => void;
};

type GameChannelOptions = {
    players: GameSessionPlayer[];
    currentUserId: string;
    gameOver: boolean;
};

/**
 * Subscribe to game presence + events for any title.
 * Use from `Game/Play` or a custom page registered in `GameType::getInertiaPageFrom`.
 */
export function useGameChannel<TState>(
    sessionId: string,
    { players, currentUserId, gameOver }: GameChannelOptions,
    handlers: GameChannelHandlers<TState>,
) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    const { disconnectedUserIds, onPlayerConnectionChanged } = useDisconnectedPlayers(players);

    const isPlayerDisconnected = (userId: string) => !isPlayerConnected(disconnectedUserIds, userId);

    const showOpponentDisconnectedBanner = shouldShowOpponentDisconnectedBanner(
        gameOver,
        currentUserId,
        disconnectedUserIds,
    );

    const usePluralDisconnectMessage = hasMultipleHumanOpponents(players, currentUserId);

    useEffect(() => {
        const channelName = `game.${sessionId}`;
        const channel = window.Echo.join(channelName);

        bindGamePresenceHandlers(channel, sessionId, currentUserId, onPlayerConnectionChanged);

        channel
            .listen('.move.made', (event: MoveMadeEvent<TState>) => handlersRef.current.onMoveMade?.(event))
            .listen('.game.started', (event: GameStartedEvent<TState>) => handlersRef.current.onGameStarted?.(event))
            .listen('.game.ended', (event: GameEndedEvent<TState>) => handlersRef.current.onGameEnded?.(event))
            .listen('.player.connection.changed', (event: PlayerConnectionChangedEvent) => {
                onPlayerConnectionChanged(event.userId, event.isConnected);
            });

        return () => {
            window.Echo.leave(channelName);
        };
    }, [sessionId, currentUserId, onPlayerConnectionChanged]);

    return {
        disconnectedUserIds,
        isPlayerDisconnected,
        showOpponentDisconnectedBanner,
        usePluralDisconnectMessage,
    };
}
