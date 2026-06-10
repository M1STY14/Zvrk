import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import { useGameChannel } from '@/hooks/useGameChannel';
import type { GameSessionBase } from '@/types/gameSession';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import SnapsBoard, { SnapsState, SNAPS_TABLE_STYLE } from '@/GameBoards/SnapsBoard';

type SessionProp = GameSessionBase & {
    state: SnapsState | null;
};

type Props = {
    auth: { user: { id: string; name: string } };
    session: SessionProp;
};

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function postMove(sessionId: string, moveData: Record<string, unknown>): Promise<Response> {
    const socketId = window.Echo?.socketId?.();

    return fetch(route('game.move', sessionId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
            ...(socketId ? { 'X-Socket-ID': socketId } : {}),
        },
        body: JSON.stringify({ move_data: moveData }),
    });
}

export default function SnapsPlay({ auth, session }: Props) {
    const initialState = session.state;
    const playerNames = useMemo(
        () =>
            session.players.reduce<Record<string, string>>((acc, player) => {
                acc[player.user.id] = player.user.name;
                return acc;
            }, {}),
        [session.players],
    );

    const initialWinnerName = session.winner_user_id ? playerNames[session.winner_user_id] ?? null : null;
    const [snapsState, setSnapsState] = useState<SnapsState | null>(initialState);
    const [gameOver, setGameOver] = useState(session.is_finished);
    const [showGameOver, setShowGameOver] = useState(session.is_finished);
    const [winnerName, setWinnerName] = useState<string | null>(initialWinnerName);

    const currentUserNumber = useMemo(() => {
        const player = session.players.find((p) => p.user.id === auth.user.id);
        return player?.player_number ?? null;
    }, [session.players, auth.user.id]);

    const stateIndicatesFinished = snapsState !== null && Object.values(snapsState.scores ?? {}).some((s) => s >= 501);
    const isFinished = gameOver || stateIndicatesFinished;
    const isYourTurn = !isFinished && snapsState !== null && snapsState.currentTurn === currentUserNumber;

    const { showOpponentDisconnectedBanner, usePluralDisconnectMessage } = useGameChannel<SnapsState>(
        session.id,
        { players: session.players, currentUserId: auth.user.id, gameOver },
        {
                onMoveMade: (event) => {
                    setSnapsState(event.state);
                    if (!gameOver && event.state && Object.values(event.state.scores ?? {}).some((s) => s >= 501)) {
                        const winnerNum = Object.keys(event.state.scores).find((k) => event.state.scores[k] >= 501) ?? null;
                        const winner = winnerNum ? playerNames[event.state.players[winnerNum]] ?? null : null;
                        setWinnerName(winner);
                        setGameOver(true);
                        setShowGameOver(true);
                    }
                },
                onGameEnded: (event) => {
                    const winner = event.winner ? playerNames[event.winner] ?? null : null;
                    setSnapsState(event.state);
                    setWinnerName(winner);
                    setGameOver(true);
                    setShowGameOver(true);
                },
                onGameStarted: (event) => {
                    setSnapsState(event.state);
                },
            },
        );

    const handlePlayCard = async (card: string) => {
        if (!isYourTurn || !snapsState || currentUserNumber === null) {
            return;
        }

        const response = await postMove(session.id, { card });

        if (!response.ok) {
            return;
        }

        const data: {
            state: SnapsState;
            move_number: number;
            game_over: boolean;
            result: { winner: string | null; draw: boolean } | null;
        } = await response.json();

        setSnapsState(data.state);

        if (!gameOver && data.state && Object.values(data.state.scores ?? {}).some((s) => s >= 501)) {
            const winnerNum = Object.keys(data.state.scores).find((k) => data.state.scores[k] >= 501) ?? null;
            const winner = winnerNum ? playerNames[data.state.players[winnerNum]] ?? null : null;
            setWinnerName(winner);
            setGameOver(true);
            setShowGameOver(true);
        } else if (data.game_over && data.result) {
            const winner = data.result.winner ? playerNames[data.result.winner] ?? null : null;
            setWinnerName(winner);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleDrawCard = async () => {
        if (!isYourTurn || !snapsState || currentUserNumber === null) {
            return;
        }

        const response = await postMove(session.id, { draw: true });

        if (!response.ok) {
            return;
        }

        const data: {
            state: SnapsState;
            move_number: number;
            game_over: boolean;
            result: { winner: string | null; draw: boolean } | null;
        } = await response.json();

        setSnapsState(data.state);
        if (!gameOver && data.state && Object.values(data.state.scores ?? {}).some((s) => s >= 501)) {
            const winnerNum = Object.keys(data.state.scores).find((k) => data.state.scores[k] >= 501) ?? null;
            const winner = winnerNum ? playerNames[data.state.players[winnerNum]] ?? null : null;
            setWinnerName(winner);
            setGameOver(true);
            setShowGameOver(true);
        } else if (data.game_over && data.result) {
            const winner = data.result.winner ? playerNames[data.result.winner] ?? null : null;
            setWinnerName(winner);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleCloseMove = async () => {
        if (!isYourTurn || !snapsState || currentUserNumber === null) return;

        const response = await postMove(session.id, { close: true });
        if (!response.ok) return;
        const data = await response.json();
        setSnapsState(data.state);
    };

    const handleSwapMove = async () => {
        if (!isYourTurn || !snapsState || currentUserNumber === null) return;

        const response = await postMove(session.id, { swap_trump: true });
        if (!response.ok) return;
        const data = await response.json();
        setSnapsState(data.state);
    };

    const handleDeclareMarriage = async (card: string) => {
        if (!isYourTurn || !snapsState || currentUserNumber === null) return;

        const response = await postMove(session.id, { card, declare_marriage: true });
        if (!response.ok) return;
        const data = await response.json();
        setSnapsState(data.state);
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div className="relative min-h-screen w-full overflow-hidden text-white">
                {!snapsState ? (
                    <div
                        className="flex min-h-screen items-center justify-center text-center text-amber-100/70"
                        style={SNAPS_TABLE_STYLE}
                    >
                        Čekanje na početak šnapsa...
                    </div>
                ) : (
                    <SnapsBoard
                        state={snapsState}
                        currentPlayerNumber={currentUserNumber}
                        isYourTurn={isYourTurn}
                        isFinished={isFinished}
                        playerNames={playerNames}
                        onPlayCard={handlePlayCard}
                        onDrawCard={handleDrawCard}
                        onClose={handleCloseMove}
                        onSwapTrump={handleSwapMove}
                        onDeclareMarriage={handleDeclareMarriage}
                    />
                )}

                {/* Floating top-right controls */}
                <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleLeave}
                        className="rounded-xl border border-red-300/30 bg-red-900/55 px-4 py-2 text-sm font-semibold text-red-50 backdrop-blur-sm transition hover:bg-red-800/70"
                    >
                        Napusti igru
                    </button>
                </div>

                {/* Disconnected banner overlay */}
                <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2">
                    <OpponentDisconnectedBanner
                        show={showOpponentDisconnectedBanner}
                        multiple={usePluralDisconnectMessage}
                    />
                </div>
            </div>

            <GameOverModal
                show={showGameOver}
                winnerName={winnerName}
                draw={false}
                onLeave={handleLeave}
            />
        </>
    );
}
