import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import UnoBoard, { UnoState } from '@/GameBoards/UnoBoard';
import { useGameChannel } from '@/hooks/useGameChannel';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const RULES = [
    { label: 'Igranje', text: 'Odigraj kartu koja odgovara boji ili broju vrha odbačenog špila.' },
    { label: 'Preskakanje', text: 'Skip karta preskače sljedećeg igrača. Reverse mijenja smjer igre.' },
    { label: 'Vući +2', text: 'Sljedeći igrač vuče 2 karte i gubi red. +4 vuče 4 karte.' },
    { label: 'Wild', text: 'Wild karta mijenja boju. Wild +4 mijenja boju i sljedeći igrač vuče 4.' },
    { label: 'Wild +4', text: 'Wild Draw Four možeš igrati samo ako nemaš kartu u trenutnoj boji.' },
    { label: 'Pobjeda', text: 'Pobijedi tako da se riješiš svih karata u ruci!' },
];

type SessionPlayer = {
    id: string;
    user_id: string;
    player_number: number;
    is_connected: boolean;
    user: { id: string; name: string };
};

type SessionGame = { slug: string; name: string };

type SessionProp = {
    id: string;
    name: string;
    is_finished: boolean;
    game: SessionGame;
    state: UnoState | null;
    players: SessionPlayer[];
    winner_user_id: string | null;
};

type Props = {
    auth: { user: { id: string; name: string } };
    session: SessionProp;
};

type MoveResponse = {
    state: UnoState;
    game_over: boolean;
    result: { winner: string | null; draw: boolean } | null;
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

const UNO_COLORS: Record<string, { bg: string; light: string; name: string }> = {
    red:    { bg: '#ef4444', light: '#fff1f1', name: 'Crvena' },
    green:  { bg: '#22c55e', light: '#f0fdf4', name: 'Zelena' },
    blue:   { bg: '#3b82f6', light: '#eff6ff', name: 'Plava' },
    yellow: { bg: '#eab308', light: '#fefce8', name: 'Žuta' },
    wild:   { bg: '#1e293b', light: '#f8fafc', name: 'Wild' },
};

export default function UnoPlay({ auth, session }: Props) {
    const isFinished = session.is_finished;

    const initialWinnerName = session.winner_user_id
        ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
        : null;

    const [unoState, setUnoState] = useState<UnoState | null>(session.state);

    // When Inertia reloads session (after opponent's move), sync state
    useEffect(() => {
        if (session.state) {
            setUnoState(session.state);
        }
    }, [session.state]);
    const [winner, setWinner] = useState<string | null>(initialWinnerName);
    const [gameOver, setGameOver] = useState(isFinished);
    const [showGameOver, setShowGameOver] = useState(isFinished);
    const [showRules, setShowRules] = useState(false);
    const [opponentDrawAnim, setOpponentDrawAnim] = useState<{ player: number; seq: number } | null>(null);
    const [opponentPlayAnim, setOpponentPlayAnim] = useState<{ player: number; seq: number } | null>(null);
    const animSeq = useRef(0);
    const unoStateRef = useRef(unoState);
    unoStateRef.current = unoState;

    const playerNames = useMemo(
        () => session.players.reduce<Record<string, string>>((acc, p) => {
            acc[p.user.id] = p.user.name;
            return acc;
        }, {}),
        [session.players],
    );

    // playerNumber → display name (for UnoBoard)
    const playerNumberToName = useMemo(
        () => session.players.reduce<Record<number, string>>((acc, p) => {
            acc[p.player_number] = p.user.name;
            return acc;
        }, {}),
        [session.players],
    );

    const myPlayer = session.players.find((p) => p.user.id === auth.user.id);
    const playerNumber = myPlayer?.player_number ?? null;

    const isYourTurn =
        !gameOver &&
        unoState !== null &&
        playerNumber !== null &&
        unoState.currentTurn === playerNumber;

    // Public broadcast has { hands: {1: N, 2: N}, drawPile: N, discardPile: [...] }
    // but UnoState (player view) has { opponentHandSizes, drawPileCount, discardPileTop }.
    // We convert here so the merge is correct.
    const mergePublicUpdate = (publicState: Record<string, unknown>) => {
        setUnoState(prev => {
            if (!prev) return prev;

            const next = { ...prev };

            // Update public fields
            if (typeof publicState.currentTurn === 'number') next.currentTurn = publicState.currentTurn;
            if (typeof publicState.direction === 'number') next.direction = publicState.direction as 1 | -1;
            if (typeof publicState.currentColor === 'string') next.currentColor = publicState.currentColor;
            if (typeof publicState.drewThisTurn === 'boolean') next.drewThisTurn = publicState.drewThisTurn;
            if (Array.isArray(publicState.forfeited)) next.forfeited = publicState.forfeited as number[];

            // hands in public broadcast = { 1: count, 2: count, ... }
            if (publicState.hands && typeof publicState.hands === 'object' && !Array.isArray(publicState.hands)) {
                const handCounts = publicState.hands as Record<string, number>;
                next.opponentHandSizes = Object.fromEntries(
                    Object.entries(handCounts)
                        .filter(([k]) => Number(k) !== playerNumber)
                        .map(([k, v]) => [k, v])
                );
            }

            // drawPile in public broadcast = count
            if (typeof publicState.drawPile === 'number') next.drawPileCount = publicState.drawPile;

            // discardPileTop and discardPileRecent come directly from publicBroadcast
            if (publicState.discardPileTop) next.discardPileTop = publicState.discardPileTop as UnoState['discardPileTop'];
            if (Array.isArray(publicState.discardPileRecent)) next.discardPileRecent = publicState.discardPileRecent as UnoState['discardPileRecent'];

            return next;
        });
    };

    const { showOpponentDisconnectedBanner, usePluralDisconnectMessage } = useGameChannel<Record<string, unknown>>(
        session.id,
        { players: session.players, currentUserId: auth.user.id, gameOver },
        {
            onMoveMade: (event) => {
                if (event.playerId === auth.user.id) {
                    mergePublicUpdate(event.state);
                } else {
                    const opponentPlayer = session.players.find(p => p.user.id === event.playerId);
                    let animDelay = 0;
                    if (opponentPlayer && typeof event.state === 'object' && event.state !== null) {
                        const st = event.state as Record<string, unknown>;
                        const seq = ++animSeq.current;
                        if (st.drewThisTurn === true) {
                            setOpponentDrawAnim({ player: opponentPlayer.player_number, seq });
                            setTimeout(() => setOpponentDrawAnim(null), 700);
                            animDelay = 700;
                        } else {
                            const newTop = st.discardPileTop as { color?: string; type?: string; value?: number | null } | null | undefined;
                            const oldTop = unoStateRef.current?.discardPileTop;
                            const discardChanged = newTop != null && (
                                newTop.color !== oldTop?.color ||
                                newTop.type !== oldTop?.type ||
                                newTop.value !== oldTop?.value
                            );
                            if (discardChanged) {
                                setOpponentPlayAnim({ player: opponentPlayer.player_number, seq });
                                setTimeout(() => setOpponentPlayAnim(null), 650);
                                animDelay = 650;
                            }
                        }
                    }
                    setTimeout(() => router.reload({ only: ['session'] }), animDelay);
                }
            },
            onGameEnded: (event) => {
                const winnerName = event.winner ? playerNames[event.winner as string] ?? null : null;
                setWinner(winnerName);
                setGameOver(true);
                setShowGameOver(true);
                mergePublicUpdate(event.state);
            },
            onGameStarted: () => {
                router.reload({ only: ['session'] });
            },
        },
    );

    const applyResponse = (data: MoveResponse) => {
        setUnoState(data.state);
        if (data.game_over && data.result) {
            const winnerName = data.result.winner ? playerNames[data.result.winner] ?? null : null;
            setWinner(winnerName);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handlePlayCard = async (cardIndex: number, wildColor?: string) => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { cardIndex, ...(wildColor ? { wildColor } : {}) });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handleDraw = async () => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { action: 'draw' });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handlePass = async () => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { action: 'pass' });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    if (!unoState) {
        return (
            <>
                <Head title={`${session.game.name} — ${session.name}`} />
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-500">Čekanje na početak igre...</p>
                </div>
            </>
        );
    }

    const currentColorMeta = UNO_COLORS[unoState.currentColor] ?? UNO_COLORS.wild;

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />
            <style>{`
                @keyframes turnPulse {
                    0%   { transform: scale(1); }
                    35%  { transform: scale(1.12); }
                    100% { transform: scale(1); }
                }
                @keyframes dotPulse {
                    0%   { transform: scale(1); }
                    40%  { transform: scale(1.6); box-shadow: 0 0 0 5px ${currentColorMeta.bg}35; }
                    100% { transform: scale(1); box-shadow: none; }
                }
            `}</style>

            <div
                style={{
                    minHeight: '100vh',
                    background: currentColorMeta.light,
                    transition: 'background 0.6s ease',
                    color: '#0f172a',
                    paddingBottom: 40,
                }}
                className="px-6 py-8"
            >
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">{session.game.name}</h1>
                            <p className="mt-1 text-sm text-slate-500">{session.name}</p>
                        </div>
                        <div className="flex gap-3 items-center">
                            <button
                                type="button"
                                onClick={() => setShowRules(r => !r)}
                                title="Pravila igre"
                                className="rounded-full border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                                style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                ?
                            </button>
                            <Link
                                href={route('lobby.index', session.game.slug)}
                                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                            >
                                Natrag u predvorje
                            </Link>
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
                            >
                                Napusti igru
                            </button>
                        </div>
                    </div>

                    {/* Rules popup */}
                    {showRules && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.35)', zIndex: 100,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }} onClick={() => setShowRules(false)}>
                            <div style={{
                                background: 'white', borderRadius: 20, padding: '28px 36px',
                                maxWidth: 620, width: '90%', boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
                            }} onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Pravila igre</h2>
                                    <button type="button" onClick={() => setShowRules(false)} style={{
                                        background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1,
                                    }}>✕</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {RULES.map((r, i) => (
                                        <div key={i}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.label}</span>
                                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{r.text}</p>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                                    <img src="/images/game_rules_explanation.svg" alt="Pravila igre" style={{ width: 300, height: 150 }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <OpponentDisconnectedBanner
                        show={showOpponentDisconnectedBanner}
                        multiple={usePluralDisconnectMessage}
                    />

                    {/* Turn indicator */}
                    <div
                        key={String(isYourTurn)}
                        className="flex items-center gap-3 mb-6"
                        style={{ animation: isYourTurn ? 'turnPulse 0.5s ease-out both' : 'none' }}
                    >
                        <div
                            style={{
                                background: currentColorMeta.bg,
                                animation: isYourTurn ? 'dotPulse 0.5s ease-out both' : 'none',
                            }}
                            className="w-4 h-4 rounded-full"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                            {isYourTurn ? 'Tvoj red' : 'Protivnik igra...'}
                        </span>
                        {playerNumber && (
                            <span className="ml-auto text-sm text-slate-500">
                                Ti si igrač {playerNumber}
                            </span>
                        )}
                    </div>

                    {/* Board */}
                    <UnoBoard
                        unoState={{ ...unoState, players: playerNumberToName }}
                        isYourTurn={isYourTurn}
                        disabled={gameOver}
                        playerNumber={playerNumber}
                        onPlayCard={handlePlayCard}
                        onDraw={handleDraw}
                        onPass={handlePass}
                        opponentDrawAnim={opponentDrawAnim}
                        opponentPlayAnim={opponentPlayAnim}
                    />
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