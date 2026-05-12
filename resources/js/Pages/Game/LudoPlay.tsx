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
    useGameChannel<LudoState>(session.id, {
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

    // Player colors for background tint
    const PLAYER_COLORS: Record<number, { bg: string; light: string; name: string }> = {
        1: { bg: '#dc2626', light: '#fff1f1', name: 'Crveni' },
        2: { bg: '#ca8a04', light: '#fefce8', name: 'Žuti' },
        3: { bg: '#16a34a', light: '#f0fdf4', name: 'Zeleni' },
        4: { bg: '#2563eb', light: '#eff6ff', name: 'Plavi' },
    };

    const currentTurn = ludoState?.currentTurn ?? 1;
    const activeColor = PLAYER_COLORS[currentTurn] ?? PLAYER_COLORS[1];

    // Map player_number → player name
    const playerNameByNumber = session.players.reduce<Record<number, string>>((acc, p) => {
        acc[p.player_number] = p.user.name;
        return acc;
    }, {});

    const rules = [
        { label: 'Izlaz', text: 'Trebaš baciti točno 5 da izvučeš žeton iz kuće. Ne, 4+1 to ne vrijedi.' },
        { label: 'Sigurno', text: 'Polja s zvjezdicom su azil. Tu nema "jedenja" — čak ni ako mrziš tog igrača.' },
        { label: 'Jedenje', text: 'Sletaš na tuđe polje? Oni idu kući, a ti dobivaš bonus potez. Okrutno, ali pošteno.' },
        { label: 'Duplo', text: 'Baci isti broj na obje kocke i igraš opet. Sreća ili vještina? Oboje, naravno.' },
        { label: '3× duplo', text: 'Tri dupla zaredom i tvoj najnapredniji žeton ide kući' },
        { label: 'Pobjeda', text: 'Prva dovedi sva 4 žetona u središte i proglasi se genijem.' },
    ];

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
                        <div style={{ display: 'flex', gap: 10 }}>
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

                    {/* Main layout: board + side panel */}
                    <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>

                        {/* Board */}
                        <div style={{ overflow: 'auto' }}>
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

                        {/* Side panel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 220, flex: 1 }}>

                            {/* Turn indicator */}
                            <div style={{
                                borderRadius: 16, padding: '14px 18px',
                                background: activeColor.bg, color: 'white',
                                transition: 'background 0.4s ease',
                                boxShadow: `0 4px 16px ${activeColor.bg}55`,
                            }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.8 }}>Na potezu</p>
                                <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800 }}>
                                    {activeColor.name}
                                    {playerNameByNumber[currentTurn] ? ` — ${playerNameByNumber[currentTurn]}` : ''}
                                </p>
                                {isYourTurn && !gameOver && (
                                    <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '3px 8px', display: 'inline-block' }}>
                                        Tvoj red! 🎲
                                    </p>
                                )}
                            </div>

                            {/* Players mini list */}
                            <div style={{ borderRadius: 16, background: 'white', border: '1px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Igrači</p>
                                {session.players.map(p => {
                                    const pc = PLAYER_COLORS[p.player_number];
                                    const isActive = p.player_number === currentTurn;
                                    const isMe = p.user.id === auth.user.id;
                                    return (
                                        <div key={p.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '6px 10px', borderRadius: 10,
                                            background: isActive ? pc.light : 'transparent',
                                            border: isActive ? `1.5px solid ${pc.bg}44` : '1.5px solid transparent',
                                            transition: 'all 0.3s',
                                        }}>
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: pc.bg, flexShrink: 0 }} />
                                            <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? '#0f172a' : '#475569', flex: 1 }}>
                                                {pc.name}{isMe ? ' (ti)' : ''}
                                            </span>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>{p.user.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Rules */}
                            <div style={{ borderRadius: 16, background: 'white', border: '1px solid #e2e8f0', padding: '12px 14px' }}>
                                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Pravila</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                    {rules.map((r, i) => (
                                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>{r.label}</span>
                                            <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{r.text}</span>
                                        </div>
                                    ))}
                                </div>
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