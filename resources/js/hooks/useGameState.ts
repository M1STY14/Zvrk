import { useCallback, useRef, useState } from 'react';

export type PlayersByNumber = Record<string, string>;

export type GameState = {
    board: number[][];
    currentPlayerId: string | null;
    winner: string | null;
    draw: boolean;
    gameOver: boolean;
};

type Params = {
    initialBoard: number[][];
    initialCurrentPlayerId: string | null;
    players: PlayersByNumber;
    initialWinner?: string | null;
    initialDraw?: boolean;
    initialGameOver?: boolean;
};

function cloneBoard(board: number[][]): number[][] {
    return board.map((row) => [...row]);
}

export function useGameState({
    initialBoard,
    initialCurrentPlayerId,
    players,
    initialWinner = null,
    initialDraw = false,
    initialGameOver = false,
}: Params) {
    const [state, setState] = useState<GameState>({
        board: initialBoard,
        currentPlayerId: initialCurrentPlayerId,
        winner: initialWinner,
        draw: initialDraw,
        gameOver: initialGameOver,
    });

    const snapshotRef = useRef<GameState | null>(null);

    const getPlayerNumber = useCallback(
        (userId: string): number | null => {
            for (const [number, id] of Object.entries(players)) {
                if (id === userId) return Number(number);
            }
            return null;
        },
        [players],
    );

    const applyOptimisticMove = useCallback(
        (row: number, col: number, userId: string) => {
            const playerNumber = getPlayerNumber(userId);
            if (playerNumber === null) return;

            setState((current) => {
                snapshotRef.current = current;

                const board = cloneBoard(current.board);
                board[row][col] = playerNumber;
                const nextNumber = playerNumber === 1 ? 2 : 1;

                return {
                    ...current,
                    board,
                    currentPlayerId: players[String(nextNumber)] ?? current.currentPlayerId,
                };
            });
        },
        [getPlayerNumber, players],
    );

    const revertOptimisticMove = useCallback(() => {
        if (snapshotRef.current) {
            setState(snapshotRef.current);
            snapshotRef.current = null;
        }
    }, []);

    const applyServerBoard = useCallback((board: number[][], nextPlayerId: string | null) => {
        snapshotRef.current = null;
        setState((current) => ({
            ...current,
            board,
            currentPlayerId: nextPlayerId,
        }));
    }, []);

    const applyGameEnd = useCallback((winner: string | null, draw: boolean, board?: number[][]) => {
        setState((current) => ({
            ...current,
            winner,
            draw,
            gameOver: true,
            board: board ?? current.board,
        }));
    }, []);

    return {
        state,
        applyOptimisticMove,
        revertOptimisticMove,
        applyServerBoard,
        applyGameEnd,
        getPlayerNumber,
    };
}
