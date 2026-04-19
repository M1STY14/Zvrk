import { useEffect, useRef } from 'react';

export type MoveMadeEvent = {
    sessionId: string;
    playerId: string;
    row: number;
    column: number;
    board: number[][];
    nextPlayerId: string | null;
};

export type GameStartedEvent = {
    sessionId: string;
    board: number[][];
    startingPlayerId: string;
};

export type GameEndedEvent = {
    sessionId: string;
    winner: string | null;
    draw: boolean;
    board: number[][];
};

export type GameChannelHandlers = {
    onMoveMade?: (event: MoveMadeEvent) => void;
    onGameStarted?: (event: GameStartedEvent) => void;
    onGameEnded?: (event: GameEndedEvent) => void;
};

export function useGameChannel(sessionId: string, handlers: GameChannelHandlers) {
    const handlersRef = useRef(handlers);
    handlersRef.current = handlers;

    useEffect(() => {
        const channelName = `game.${sessionId}`;
        const channel = window.Echo.join(channelName);

        channel
            .listen('.move.made', (event: MoveMadeEvent) => handlersRef.current.onMoveMade?.(event))
            .listen('.game.started', (event: GameStartedEvent) => handlersRef.current.onGameStarted?.(event))
            .listen('.game.ended', (event: GameEndedEvent) => handlersRef.current.onGameEnded?.(event));

        return () => {
            window.Echo.leave(channelName);
        };
    }, [sessionId]);
}
