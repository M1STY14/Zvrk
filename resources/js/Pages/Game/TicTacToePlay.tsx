import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import TicTacToeBoard, { TicTacToeState } from '@/GameBoards/TicTacToeBoard';
import { useGameChannel } from '@/hooks/useGameChannel';
import { useGameState } from '@/hooks/useGameState';
import type { GameSessionBase } from '@/types/gameSession';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type SessionProp = GameSessionBase & {
    state: TicTacToeState | null;
};

type Props = PageProps<{ session: SessionProp }>;

const RULES = [
    { label: 'Cilj', text: 'Posloži tri svoja znaka u niz prije protivnika.' },
    { label: 'Potezi', text: 'Igrači naizmjence postavljaju svoj znak — ❌ ili ⭕ — na prazno polje.' },
    { label: 'Pobjeda', text: 'Tri znaka u redu: vodoravno, okomito ili dijagonalno.' },
    { label: 'Neriješeno', text: 'Ako se sva polja popune bez tri u nizu, igra je neriješena.' },
];

/** Background leans red on X's turn, blue on O's turn — same "living gradient" idea as Uno. */
const TURN_BG: Record<number, string> = {
    1: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.10) 0%, #7f1d2e 20%, #3b0f1a 56%, #160810 100%)',
    2: 'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.10) 0%, #14507f 20%, #0c2740 56%, #08121d 100%)',
};

const MARK_LABEL: Record<number, { glyph: string; name: string; color: string }> = {
    1: { glyph: '✕', name: 'X', color: '#ff5d6c' },
    2: { glyph: '◯', name: 'O', color: '#4cb5ff' },
};

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function TicTacToePlay({ auth, session }: Props) {
    const playersByNumber: Record<string, string> = session.state?.players ?? {};
    const initialCurrentPlayerId = session.state
        ? playersByNumber[String(session.state.currentTurn)] ?? null
        : null;
    const initialBoard = session.state?.board ?? [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
    ];

    const isFinished = session.is_finished;
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
    const [showRules, setShowRules] = useState(false);

    const currentUserId = auth.user.id;

    const playerNames = useMemo(
        () =>
            session.players.reduce<Record<string, string>>((acc, player) => {
                acc[player.user.id] = player.user.name;
                return acc;
            }, {}),
        [session.players],
    );

    const { showOpponentDisconnectedBanner, usePluralDisconnectMessage } = useGameChannel<TicTacToeState>(
        session.id,
        { players: session.players, currentUserId, gameOver: state.gameOver },
        {
            onMoveMade: (event) => applyServerBoard(event.state.board, event.nextPlayerId),
            onGameEnded: (event) => {
                const winnerName = event.winner ? playerNames[event.winner] ?? null : null;
                applyGameEnd(winnerName, event.draw, event.state.board);
                setShowGameOver(true);
            },
            onGameStarted: (event) => applyServerBoard(event.state.board, event.startingPlayerId),
        },
    );

    const currentUserNumber = getPlayerNumber(currentUserId);
    const isYourTurn = !state.gameOver && state.currentPlayerId === currentUserId;
    const currentTurnNumber = state.currentPlayerId ? getPlayerNumber(state.currentPlayerId) ?? 1 : 1;
    const myMark = currentUserNumber ? MARK_LABEL[currentUserNumber] : null;
    const turnColor = MARK_LABEL[currentTurnNumber]?.color ?? '#cbd5e1';

    const handleMove = async (row: number, col: number) => {
        if (!isYourTurn || currentUserNumber === null) return;

        applyOptimisticMove(row, col, currentUserId);

        const socketId = window.Echo?.socketId?.();

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
                body: JSON.stringify({ move_data: { row, col } }),
            });

            if (!response.ok) {
                revertOptimisticMove();
                return;
            }

            const data: {
                state: TicTacToeState;
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
        } catch {
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
            <style>{`
                @keyframes ttDot {
                    0% { transform: scale(1); }
                    40% { transform: scale(1.5); box-shadow: 0 0 0 5px ${turnColor}33; }
                    100% { transform: scale(1); box-shadow: none; }
                }
            `}</style>

            <div
                className="px-6 py-8"
                style={{
                    minHeight: '100vh',
                    background: TURN_BG[currentTurnNumber] ?? TURN_BG[1],
                    transition: 'background 0.6s ease',
                    color: '#e2e8f0',
                }}
            >
                <div className="mx-auto max-w-3xl">
                    {/* Header */}
                    <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 drop-shadow">
                                {session.game.name}
                            </h1>
                            <p className="mt-1 text-sm text-slate-300/80 drop-shadow-sm">{session.name}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowRules((r) => !r)}
                                title="Pravila igre"
                                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/40 bg-slate-900/30 text-sm font-semibold text-slate-100 transition hover:bg-slate-900/50"
                            >
                                ?
                            </button>
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="rounded-full border border-slate-300/30 bg-slate-900/60 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-900/80"
                            >
                                Napusti igru
                            </button>
                        </div>
                    </div>

                    {/* Rules popup */}
                    {showRules && (
                        <div
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onClick={() => setShowRules(false)}
                        >
                            <div
                                style={{
                                    background: 'white', borderRadius: 20, padding: '28px 36px',
                                    maxWidth: 560, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.25)', color: '#0f172a',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Pravila igre</h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowRules(false)}
                                        style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {RULES.map((r) => (
                                        <div key={r.label}>
                                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.label}</span>
                                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{r.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <OpponentDisconnectedBanner
                        show={showOpponentDisconnectedBanner}
                        multiple={usePluralDisconnectMessage}
                    />

                    {/* Turn indicator */}
                    <div key={String(isYourTurn)} className="mb-8 flex items-center gap-3">
                        <span
                            className="h-4 w-4 rounded-full"
                            style={{
                                background: turnColor,
                                border: '1px solid rgba(226,232,240,0.6)',
                                animation: isYourTurn ? 'ttDot 0.5s ease-out both' : 'none',
                            }}
                        />
                        <span className="text-sm font-semibold text-slate-200 drop-shadow-sm">
                            {state.gameOver ? 'Igra je gotova' : isYourTurn ? 'Tvoj red' : 'Protivnik igra...'}
                        </span>
                        {myMark && (
                            <span className="ml-auto text-sm text-slate-300/90 drop-shadow-sm">
                                Ti si:{' '}
                                <span className="font-bold" style={{ color: myMark.color }}>
                                    {myMark.name}
                                </span>
                            </span>
                        )}
                    </div>

                    {/* Board */}
                    <TicTacToeBoard
                        board={state.board}
                        isYourTurn={isYourTurn}
                        disabled={state.gameOver}
                        onMove={handleMove}
                    />
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
