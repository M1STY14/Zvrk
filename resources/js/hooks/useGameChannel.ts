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
};

export type GameChannelHandlers<TState> = {
    onMoveMade?: (event: MoveMadeEvent<TState>) => void;
    onGameStarted?: (event: GameStartedEvent<TState>) => void;
    onGameEnded?: (event: GameEndedEvent<TState>) => void;
};

export function useGameChannel<TState>(sessionId: string, handlers: GameChannelHandlers<TState>) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const channelName = `game.${sessionId}`;
        const channel = window.Echo.join(channelName);

        channel
            .listen('.move.made', (event: MoveMadeEvent<TState>) => handlersRef.current.onMoveMade?.(event))
            .listen('.game.started', (event: GameStartedEvent<TState>) => handlersRef.current.onGameStarted?.(event))
            .listen('.game.ended', (event: GameEndedEvent<TState>) => handlersRef.current.onGameEnded?.(event));

        return () => {
            window.Echo.leave(channelName);
        };
    }, [sessionId]);
}
