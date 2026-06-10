import GameOverModal from '@/Components/Game/GameOverModal';

const RULES = [
    { label: 'Kretanje', text: 'Žetoni se kreću dijagonalno unaprijed po tamnim poljima. Kralj se može kretati i unazad.' },
    { label: 'Uzimanje', text: 'Preskočiš protivničkog žetona ako je polje iza njega prazno. Uzimanje je obavezno!' },
    { label: 'Višestruko', text: 'Ako možeš uzeti više žetona odjednom, nastavi niz skokova u istom potezu.' },
    { label: 'Kralj', text: 'Dođeš li žetonom do zadnjeg reda protivnika, postaje kralj i dobiva oznaku ♛.' },
    { label: 'Kraj igre', text: 'Pobijedi ako protivnik ostane bez žetona ili nema nijedan legalan potez.' },
    { label: 'Obaveza', text: 'Ako ijedan tvoj žeton može uzeti, moraš uzeti — ne možeš igrati drugog žetona.' },
];
import CheckersBoard, { CheckersState } from '@/GameBoards/CheckersBoard';
import { useGameChannel } from '@/hooks/useGameChannel';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
    state: CheckersState | null;
    players: SessionPlayer[];
    winner_user_id: string | null;
};

type Props = {
    auth: { user: { id: string; name: string } };
    session: SessionProp;
};

type MoveResponse = {
    state: CheckersState;
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

export default function CheckersPlay({ auth, session }: Props) {
    const isFinished = session.is_finished;

    const initialWinnerName = session.winner_user_id
        ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
        : null;

    const [checkersState, setCheckersState] = useState<CheckersState | null>(session.state);
    const [winner, setWinner] = useState<string | null>(initialWinnerName);
    const [gameOver, setGameOver] = useState(isFinished);
    const [showGameOver, setShowGameOver] = useState(isFinished);
    const [showRules, setShowRules] = useState(false);

    const playerNames = useMemo(
        () =>
            session.players.reduce<Record<string, string>>((acc, p) => {
                acc[p.user.id] = p.user.name;
                return acc;
            }, {}),
        [session.players],
    );

    const myPlayer = session.players.find((p) => p.user.id === auth.user.id);
    const playerNumber = myPlayer?.player_number ?? null;

    const prevCapturedRef = useRef<number>(0);
    const [newlyCapturedIdx, setNewlyCapturedIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!checkersState || !playerNumber) return;
        const oppNumber = playerNumber === 1 ? 2 : 1;
        const oppRemaining = checkersState.board.flat().filter(v => v === oppNumber || v === oppNumber + 2).length;
        const captured = 12 - oppRemaining;
        if (captured > prevCapturedRef.current) {
            setNewlyCapturedIdx(captured - 1);
            setTimeout(() => setNewlyCapturedIdx(null), 700);
        }
        prevCapturedRef.current = captured;
    }, [checkersState, playerNumber]);

    const isYourTurn =
        !gameOver &&
        checkersState !== null &&
        playerNumber !== null &&
        checkersState.currentTurn === playerNumber;

    useGameChannel<CheckersState>(
        session.id,
        { players: session.players, currentUserId: auth.user.id, gameOver },
        {
            onMoveMade: (event) => {
                setCheckersState(event.state);
            },
            onGameEnded: (event) => {
                const winnerName = event.winner ? playerNames[event.winner] ?? null : null;
                setWinner(winnerName);
                setGameOver(true);
                setShowGameOver(true);
                setCheckersState(event.state);
            },
            onGameStarted: (event) => {
                setCheckersState(event.state);
            },
        },
    );

    const applyResponse = (data: MoveResponse) => {
        setCheckersState(data.state);
        if (data.game_over && data.result) {
            const winnerName = data.result.winner ? playerNames[data.result.winner] ?? null : null;
            setWinner(winnerName);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleMove = async (
        from: { row: number; col: number },
        path: { row: number; col: number }[],
    ) => {
        if (!isYourTurn || gameOver) return;
        const res = await postMove(session.id, { from, path });
        if (!res.ok) return;
        const data: MoveResponse = await res.json();
        applyResponse(data);
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    if (!checkersState) {
        return (
            <>
                <Head title={`${session.game.name} — ${session.name}`} />
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-500">Čekanje na početak igre...</p>
                </div>
            </>
        );
    }

    const PLAYER_COLORS: Record<number, { name: string; bg: string; light: string }> = {
        1: { name: 'Crveni', bg: '#ff1d25', light: '#fff1f1' },
        2: { name: 'Plavi',  bg: '#3fa9f5', light: '#eff8ff' },
    };

    const currentTurnColor = PLAYER_COLORS[checkersState.currentTurn] ?? PLAYER_COLORS[1];
    const myColor = playerNumber ? PLAYER_COLORS[playerNumber] : null;

    return (
        <>
            <style>{`
                @keyframes capturePopIn {
                    0%   { opacity: 0; transform: scale(0.2) translateY(10px); }
                    60%  { opacity: 1; transform: scale(1.2) translateY(-4px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div
                style={{
                    minHeight: '100vh',
                    background: currentTurnColor.light,
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

                    {/* Turn indicator */}
                    <div className="flex items-center gap-3 mb-3 mt-4">
                        <div
                            style={{ background: currentTurnColor.bg }}
                            className="w-4 h-4 rounded-full"
                        />
                        <span className="text-sm font-semibold text-slate-700">
                            {isYourTurn ? 'Tvoj red' : `${currentTurnColor.name} igrač igra...`}
                        </span>
                        {myColor && (
                            <span className="ml-auto text-sm text-slate-500">
                                Ti si:{' '}
                                <span className="font-semibold" style={{ color: myColor.bg }}>
                                    {myColor.name}
                                </span>
                            </span>
                        )}
                    </div>

                    {/* Opponent's captured pieces (my pieces that the opponent has captured) — above the board */}
                    {playerNumber && (() => {
                        const myPieceVal1 = playerNumber;
                        const myPieceVal2 = playerNumber + 2;
                        const mySrc = playerNumber === 1 ? '/images/checkers_game_props/checkers_buds_red.svg' : '/images/checkers_game_props/checkers_buds_blue.svg';
                        const myRemaining = checkersState.board.flat().filter(v => v === myPieceVal1 || v === myPieceVal2).length;
                        const lostByMe = 12 - myRemaining;
                        if (lostByMe === 0) return null;

                        return (
                            <div className="flex gap-1 mb-3 justify-center flex-wrap">
                                {Array.from({ length: lostByMe }).map((_, i) => (
                                    <img key={i} src={mySrc} width={50} height={50} style={{ opacity: 0.85, filter: 'grayscale(0.3)' 
                                    }} />
                                ))}
                            </div>
                        );
                    })()}

                    {/* Board */}
                    <CheckersBoard
                        board={checkersState.board}
                        isYourTurn={isYourTurn}
                        disabled={gameOver}
                        playerNumber={playerNumber}
                        onMove={handleMove}
                    />

                    {/* My captured pieces (opponent's pieces I've captured) — below board */}
                    {playerNumber && (() => {
                        const oppNumber = playerNumber === 1 ? 2 : 1;
                        const oppPieceVal1 = oppNumber;
                        const oppPieceVal2 = oppNumber + 2;
                        const oppSrc = oppNumber === 1 ? '/images/checkers_game_props/checkers_buds_red.svg' : '/images/checkers_game_props/checkers_buds_blue.svg';
                        const oppRemaining = checkersState.board.flat().filter(v => v === oppPieceVal1 || v === oppPieceVal2).length;
                        const capturedByMe = 12 - oppRemaining;
                        if (capturedByMe === 0) return null;

                        return (
                            <div className="flex gap-1 mt-12 justify-center flex-wrap">
                                {Array.from({ length: capturedByMe }).map((_, i) => (
                                    <img key={i} src={oppSrc} width={50} height={50} style={{ opacity: 0.85,
                                            animation: i === newlyCapturedIdx ? 'capturePopIn 0.5s cubic-bezier(0.22,0.61,0.36,1) forwards' : undefined,
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    })()}

                    {/* Players */}
                    {/* <div className="mt-12 flex gap-4 justify-center">
                        {session.players.map((p) => {
                            const pc = PLAYER_COLORS[p.player_number];
                            const isActive = checkersState.currentTurn === p.player_number;
                            const isMe = p.user.id === auth.user.id;
                            return (
                                <div
                                    key={p.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border"
                                    style={{
                                        borderColor: isActive ? pc.bg : '#e2e8f0',
                                        background: isActive ? `${pc.bg}15` : 'white',
                                    }}
                                >
                                    <div className="w-3 h-3 rounded-full" style={{ background: pc.bg }} />
                                    <span className="text-sm font-medium text-slate-700">
                                        {p.user.name} {isMe ? '(ti)' : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div> */}
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