import GameOverModal from '@/Components/Game/GameOverModal';
import GameBoardWrapper from '@/GameBoards/GameBoardWrapper';
import { useGameChannel } from '@/hooks/useGameChannel';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { LudoState } from '@/GameBoards/LudoBoard';

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionPlayer = {
    id: string;
    user_id: string;
    player_number: number;
    user: { id: string; name: string };
};

type SessionGame = { slug: string; name: string };

type SessionProp = {
    id: string;
    name: string;
    status: string;
    game: SessionGame;
    state: LudoState | null;
    players: SessionPlayer[];
    winner_user_id: string | null;
};

type Props = {
    auth: { user: { id: string; name: string } };
    session: SessionProp;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function LudoPlay({ auth, session }: Props) {
    const isFinished = session.status === 'finished' || session.status === 'abandoned';

    const initialWinnerName = session.winner_user_id
        ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
        : null;

    // Build initial Ludo state from server prop
    const buildInitialLudoState = (): LudoState | null => {
        if (!session.state) return null;
        return session.state;
    };

    const [ludoState, setLudoState] = useState<LudoState | null>(buildInitialLudoState);
    const [winner, setWinner] = useState<string | null>(initialWinnerName);
    const [gameOver, setGameOver] = useState(isFinished);
    const [showGameOver, setShowGameOver] = useState(isFinished);

    const playerNames = useMemo(
        () =>
            session.players.reduce<Record<string, string>>((acc, p) => {
                acc[p.user.id] = p.user.name;
                return acc;
            }, {}),
        [session.players],
    );

    // player_number for current user (1-based)
    const myPlayer = session.players.find((p) => p.user.id === auth.user.id);
    const playerNumber = myPlayer?.player_number ?? null;

    const isYourTurn =
        !gameOver &&
        ludoState !== null &&
        playerNumber !== null &&
        ludoState.currentTurn === playerNumber;

    // Real-time updates from other players via WebSocket
    useGameChannel(session.id, {
        onMoveMade: (event) => {
            if (event.state && 'tokens' in event.state) {
                setLudoState(event.state as unknown as LudoState);
            }
        },
        onGameEnded: (event) => {
            const winnerName = event.winner ? playerNames[event.winner] ?? null : null;
            setWinner(winnerName);
            setGameOver(true);
            setShowGameOver(true);
            if (event.state && 'tokens' in event.state) {
                setLudoState(event.state as unknown as LudoState);
            }
        },
        onGameStarted: (event) => {
            if (event.state && 'tokens' in event.state) {
                setLudoState(event.state as unknown as LudoState);
            }
        },
    });

    // Handle a move response from the server
    type MoveResponse = {
        state: LudoState;
        game_over: boolean;
        result: { winner: string | null; draw: boolean } | null;
    };

    const applyResponse = (data: MoveResponse) => {
        setLudoState(data.state);
        if (data.game_over && data.result) {
            const winnerName = data.result.winner ? playerNames[data.result.winner] ?? null : null;
            setWinner(winnerName);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleRoll = async () => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { action: 'roll' });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handleMove = async (tokenIndex: number, diceValue: number) => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { tokenIndex, diceValue });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    if (!ludoState) {
        return (
            <>
                <Head title={`${session.game.name} — ${session.name}`} />
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-500">Čekanje na početak igre...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
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

                    {/* Board */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
                        <GameBoardWrapper
                            gameSlug="ludo"
                            ludoState={ludoState}
                            isYourTurn={isYourTurn}
                            disabled={gameOver}
                            playerNumber={playerNumber}
                            onRoll={handleRoll}
                            onMove={handleMove}
                        />
                    </div>
                </div>
            </div>

            <GameOverModal
                show={showGameOver}
                winnerName={winner}
                draw={false}
                onLeave={handleLeave}
            />
        </>
    );
}