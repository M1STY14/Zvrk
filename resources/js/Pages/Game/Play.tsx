import GameOverModal from '@/Components/Game/GameOverModal';
import PlayerInfo from '@/Components/Game/PlayerInfo';
import TurnIndicator from '@/Components/Game/TurnIndicator';
import GameBoardWrapper from '@/GameBoards/GameBoardWrapper';
import { useGameChannel } from '@/hooks/useGameChannel';
import { useGameState } from '@/hooks/useGameState';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const MARKS: Record<number, string> = { 1: '❌', 2: '⭕' };

type SessionPlayer = {
    id: string;
    user_id: string;
    player_number: number;
    user: {
        id: string;
        name: string;
    };
};

type SessionGame = {
    slug: string;
    name: string;
};

type SessionState = {
    board: number[][];
    currentTurn: number;
    players: Record<string, string>;
};

type SessionProp = {
    id: string;
    name: string;
    status: string;
    game: SessionGame;
    state: SessionState | null;
    players: SessionPlayer[];
    winner_user_id: string | null;
};

type Props = PageProps<{ session: SessionProp }>;

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function Play({ auth, session }: Props) {
    const initialBoard = session.state?.board ?? [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ];

    const playersByNumber: Record<string, string> = session.state?.players ?? {};
    const initialCurrentPlayerId = session.state ? playersByNumber[String(session.state.currentTurn)] ?? null : null;

    const isFinished = session.status === 'finished' || session.status === 'abandoned';
    const initialWinnerName = session.winner_user_id
        ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
        : null;

    const {
        state,
        applyOptimisticMove,
        revertOptimisticMove,
        applyServerBoard,
        applyGameEnd,
        getPlayerNumber,
    } = useGameState({
        initialBoard,
        initialCurrentPlayerId,
        players: playersByNumber,
        initialWinner: initialWinnerName,
        initialDraw: false,
        initialGameOver: isFinished,
    });

    const [showGameOver, setShowGameOver] = useState(isFinished);

    const playerNames = useMemo(() => {
        return session.players.reduce<Record<string, string>>((acc, player) => {
            acc[player.user.id] = player.user.name;
            return acc;
        }, {});
    }, [session.players]);

    const displayPlayers = useMemo(
        () =>
            [...session.players]
                .sort((a, b) => a.player_number - b.player_number)
                .map((p) => ({
                    id: p.user.id,
                    name: p.user.name,
                    player_number: p.player_number,
                    mark: MARKS[p.player_number] ?? '',
                })),
        [session.players],
    );

    const currentUserId = auth.user.id;
    const currentUserNumber = getPlayerNumber(currentUserId);
    const isYourTurn = !state.gameOver && state.currentPlayerId === currentUserId;
    const currentMark = state.currentPlayerId
        ? MARKS[getPlayerNumber(state.currentPlayerId) ?? 0] ?? ''
        : '';

    useGameChannel(session.id, {
        onMoveMade: (event) => {
            applyServerBoard(event.board, event.nextPlayerId);
        },
        onGameEnded: (event) => {
            const winnerName = event.winner ? playerNames[event.winner] ?? null : null;
            applyGameEnd(winnerName, event.draw, event.board);
            setShowGameOver(true);
        },
        onGameStarted: (event) => {
            applyServerBoard(event.board, event.startingPlayerId);
        },
    });

    const handleMove = async (row: number, col: number) => {
        if (!isYourTurn || currentUserNumber === null) return;

        applyOptimisticMove(row, col, currentUserId);

        const socketId = window.Echo.socketId();

        try {
            const response = await fetch(route('game.move', session.id), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    ...(socketId ? { 'X-Socket-ID': socketId } : {}),
                },
                body: JSON.stringify({
                    move_data: { row, col },
                }),
            });

            if (!response.ok) {
                revertOptimisticMove();
                return;
            }

            const data: {
                state: SessionState;
                move_number: number;
                game_over: boolean;
                result: { winner: string | null; draw: boolean } | null;
            } = await response.json();

            const nextPlayerId = data.state.players[String(data.state.currentTurn)] ?? null;
            applyServerBoard(data.state.board, nextPlayerId);

            if (data.game_over && data.result) {
                const winnerName = data.result.winner ? playerNames[data.result.winner] ?? null : null;
                applyGameEnd(winnerName, data.result.draw, data.state.board);
                setShowGameOver(true);
            }
        } catch (error) {
            revertOptimisticMove();
        }
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight">{session.game.name}</h1>
                            <p className="mt-1 text-sm text-slate-500">{session.name}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={route('lobby.index', session.game.slug)}
                                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                            >
                                Natrag u predvorje
                            </Link>
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                                Napusti igru
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <TurnIndicator
                                currentPlayerId={state.currentPlayerId}
                                currentUserId={currentUserId}
                                playerNames={playerNames}
                                currentMark={currentMark}
                            />

                            <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                                Ti si: {auth.user.name} {currentUserNumber ? MARKS[currentUserNumber] : ''}
                            </div>
                        </div>

                        <GameBoardWrapper
                            gameSlug={session.game.slug}
                            board={state.board}
                            isYourTurn={isYourTurn}
                            disabled={state.gameOver}
                            onMove={handleMove}
                        />

                        <div className="mt-8">
                            <PlayerInfo players={displayPlayers} currentPlayerId={state.currentPlayerId} />
                        </div>
                    </div>
                </div>
            </div>

            <GameOverModal
                show={showGameOver}
                winnerName={state.winner}
                draw={state.draw}
                onLeave={handleLeave}
            />
        </>
    );
}
