import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import GameBoardWrapper from '@/GameBoards/GameBoardWrapper';
import { useGameChannel } from '@/hooks/useGameChannel';
import type { GameSessionBase } from '@/types/gameSession';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { LudoState } from '@/GameBoards/LudoBoard';

type SessionProp = GameSessionBase & {
    state: LudoState | null;
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

const RULES = [
    { label: 'Izlaz', text: 'Trebaš baciti točno 5 da izvučeš žeton iz kuće. Ne, 4+1 to ne vrijedi.' },
    { label: 'Sigurno', text: 'Polja s zvjezdicom su azil. Tu nema "jedenja" — čak ni ako mrziš tog igrača.' },
    { label: 'Jedenje', text: 'Sletaš na tuđe polje? Oni idu kući, a ti dobivaš bonus potez. Okrutno, ali pošteno.' },
    { label: 'Duplo', text: 'Baci isti broj na obje kocke i igraš opet. Sreća ili vještina? Oboje, naravno.' },
    { label: '3× duplo', text: 'Tri dupla zaredom i tvoj najnapredniji žeton ide kući.' },
    { label: 'Pobjeda', text: 'Prva dovedi sva 4 žetona u središte i proglasi se genijem.' },
];

export default function LudoPlay({ auth, session }: Props) {
    const isFinished = session.is_finished;
    const [showRules, setShowRules] = useState(false);

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

    const { isPlayerDisconnected, showOpponentDisconnectedBanner, usePluralDisconnectMessage } =
        useGameChannel<LudoState>(
            session.id,
            { players: session.players, currentUserId: auth.user.id, gameOver },
            {
                onMoveMade: (event) => {
                    setLudoState(event.state);
                },
                onGameEnded: (event) => {
                    const winnerName = event.winner ? playerNames[event.winner] ?? null : null;
                    setWinner(winnerName);
                    setGameOver(true);
                    setShowGameOver(true);
                    setLudoState(event.state);
                },
                onGameStarted: (event) => {
                    setLudoState(event.state);
                },
            },
        );

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

    // Player colors for background tint
    const PLAYER_COLORS: Record<number, { bg: string; light: string; name: string }> = {
        1: { bg: '#dc2626', light: '#fff1f1', name: 'Crveni' },
        2: { bg: '#ca8a04', light: '#fefce8', name: 'Žuti' },
        3: { bg: '#16a34a', light: '#f0fdf4', name: 'Zeleni' },
        4: { bg: '#2563eb', light: '#eff6ff', name: 'Plavi' },
    };

    const currentTurn = ludoState?.currentTurn ?? 1;
    const activeColor = PLAYER_COLORS[currentTurn] ?? PLAYER_COLORS[1];


    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div
                style={{
                    minHeight: '100vh',
                    background: activeColor.light,
                    transition: 'background 0.6s ease',
                    color: '#0f172a',
                    paddingBottom: 40,
                }}
            >
                {/* Header */}
                <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{session.game.name}</h1>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{session.name}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setShowRules(r => !r)}
                                title="Pravila igre"
                                style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    border: '1.5px solid #cbd5e1', background: 'white',
                                    fontSize: 15, fontWeight: 700, color: '#475569',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                            >
                                ?
                            </button>
                            <Link
                                href={route('lobby.index', session.game.slug)}
                                style={{
                                    borderRadius: 100, border: '1.5px solid #cbd5e1', padding: '8px 18px',
                                    fontSize: 13, fontWeight: 600, color: '#475569', textDecoration: 'none',
                                    background: 'white', transition: 'background 0.15s',
                                }}
                            >
                                Natrag u predvorje
                            </Link>
                            <button
                                type="button"
                                onClick={handleLeave}
                                style={{
                                    borderRadius: 100, border: 'none', padding: '8px 18px',
                                    fontSize: 13, fontWeight: 600, color: 'white',
                                    background: '#0f172a', cursor: 'pointer',
                                }}
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

                    {/* Board + player avatars */}
                    <OpponentDisconnectedBanner
                        show={showOpponentDisconnectedBanner}
                        multiple={usePluralDisconnectMessage}
                    />

                    <style>{`
                        @keyframes avatarPulse {
                            0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.3); }
                            50%       { box-shadow: 0 0 0 8px rgba(0,0,0,0.08); transform: scale(1.08); }
                        }
                    `}</style>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                        {/* Board with avatar corners */}
                        <div style={{ position: 'relative', width: 660, height: 660, flexShrink: 0 }}>
                            {/* Player avatar circles at each corner */}
                            {session.players.map(p => {
                                const pc = PLAYER_COLORS[p.player_number];
                                const isActive = p.player_number === currentTurn;
                                const isMe = p.user.id === auth.user.id;
                                const disconnected = isPlayerDisconnected(p.user.id);
                                const initials = p.user.name.slice(0, 2).toUpperCase();

                                const corner: Record<number, React.CSSProperties> = {
                                    3: { top: -26,    left: -26 },
                                    2: { top: -26,    right: -26 },
                                    1: { bottom: -26, left: -26 },
                                    4: { bottom: -26, right: -26 },
                                };
                                const pos = corner[p.player_number];
                                if (!pos) return null;

                                return (
                                    <div key={p.id} style={{
                                        position: 'absolute',
                                        ...pos,
                                        width: 52, height: 52,
                                        borderRadius: '50%',
                                        background: pc.bg,
                                        border: `3px solid ${isMe ? 'white' : pc.bg}`,
                                        outline: isMe ? `2px solid ${pc.bg}` : 'none',
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 13,
                                        zIndex: 30,
                                        opacity: disconnected ? 0.45 : 1,
                                        animation: isActive && !disconnected ? 'avatarPulse 1s ease-in-out infinite' : 'none',
                                        transition: 'box-shadow 0.3s, opacity 0.3s',
                                        cursor: 'default',
                                        userSelect: 'none',
                                    }}
                                    title={disconnected ? `${p.user.name} (odspojen)` : p.user.name}>
                                        <span>{initials}</span>
                                        {isMe && <span style={{ fontSize: 8, opacity: 0.85, lineHeight: 1 }}>ti</span>}
                                        {disconnected && (
                                            <span style={{ fontSize: 7, fontWeight: 800, lineHeight: 1, marginTop: 1 }}>
                                                OFF
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Board — fills the wrapper exactly */}
                            <div style={{ position: 'absolute', top: 0, left: 0 }}>
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
