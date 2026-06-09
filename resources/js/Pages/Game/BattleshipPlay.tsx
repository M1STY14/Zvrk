import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import BattleshipBoard, {
    BattleshipState,
    Cell,
    FLEET,
    GRID_SIZE,
    Missile,
    Ship,
    SHIP_COLORS,
} from '@/GameBoards/BattleshipBoard';
import { useGameChannel } from '@/hooks/useGameChannel';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const other = (playerNumber: number) => (playerNumber === 1 ? 2 : 1);

type ActiveMissile = Missile & { target: number };

type Orientation = 'horizontal' | 'vertical';
type Placement = { row: number; col: number; orientation: Orientation };

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
    state: BattleshipState | null;
    players: SessionPlayer[];
    winner_user_id: string | null;
};

type Props = {
    auth: { user: { id: string; name: string } };
    session: SessionProp;
};

type MoveResponse = {
    state: BattleshipState;
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

function cellsFor(row: number, col: number, orientation: Orientation, size: number): Cell[] {
    return Array.from({ length: size }, (_, i) =>
        orientation === 'horizontal' ? { row, col: col + i } : { row: row + i, col },
    );
}

function inBounds(cell: Cell): boolean {
    return cell.row >= 0 && cell.row < GRID_SIZE && cell.col >= 0 && cell.col < GRID_SIZE;
}

/** Validate one placement against the cells already occupied by other ships. */
function placementValid(cells: Cell[], occupied: Set<string>): boolean {
    return cells.every((c) => inBounds(c) && !occupied.has(`${c.row},${c.col}`));
}

function occupiedFrom(placements: Record<string, Placement>, except?: string): Set<string> {
    const occupied = new Set<string>();
    for (const [name, placement] of Object.entries(placements)) {
        if (name === except) continue;
        const size = FLEET.find((f) => f.name === name)!.size;
        for (const cell of cellsFor(placement.row, placement.col, placement.orientation, size)) {
            occupied.add(`${cell.row},${cell.col}`);
        }
    }
    return occupied;
}

function randomFleet(): Record<string, Placement> {
    const placements: Record<string, Placement> = {};
    for (const ship of FLEET) {
        let placed = false;
        while (!placed) {
            const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            const row = Math.floor(Math.random() * GRID_SIZE);
            const col = Math.floor(Math.random() * GRID_SIZE);
            const cells = cellsFor(row, col, orientation, ship.size);
            if (placementValid(cells, occupiedFrom(placements))) {
                placements[ship.name] = { row, col, orientation };
                placed = true;
            }
        }
    }
    return placements;
}

function shipsFromPlacements(placements: Record<string, Placement>): Ship[] {
    return Object.entries(placements).map(([name, placement]) => ({
        name,
        cells: cellsFor(placement.row, placement.col, placement.orientation, FLEET.find((f) => f.name === name)!.size),
    }));
}

export default function BattleshipPlay({ auth, session }: Props) {
    const isFinished = session.is_finished;

    const initialWinnerName = session.winner_user_id
        ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
        : null;

    const [state, setState] = useState<BattleshipState | null>(session.state);
    const [winner, setWinner] = useState<string | null>(initialWinnerName);
    const [gameOver, setGameOver] = useState(isFinished);
    const [showGameOver, setShowGameOver] = useState(isFinished);

    // POV currently shown — lags `state.currentTurn` so the missile lands before the board flips.
    const [viewTurn, setViewTurn] = useState<number>(session.state?.currentTurn ?? 1);
    const [missile, setMissile] = useState<ActiveMissile | null>(null);
    const prevAttackCounts = useRef<Record<number, number> | null>(null);
    const missileSeq = useRef(0);
    const firing = useRef(false);
    const animating = missile !== null;

    // Placement (local until confirmed).
    const [placements, setPlacements] = useState<Record<string, Placement>>({});
    const [selectedShip, setSelectedShip] = useState<string | null>(FLEET[0].name);
    const [orientation, setOrientation] = useState<Orientation>('horizontal');
    const [hoverCell, setHoverCell] = useState<Cell | null>(null);

    useEffect(() => {
        const id = window.setTimeout(() => setState(session.state), 0);
        return () => window.clearTimeout(id);
    }, [session.state]);

    // Detect a freshly landed attack (mine or the opponent's) and launch a missile at it.
    // The POV is held on the defender's board until the missile lands (see handleMissileComplete).
    useEffect(() => {
        if (!state || state.phase !== 'attack') return;

        const counts: Record<number, number> = {
            1: state.boards[1]?.attacks.length ?? 0,
            2: state.boards[2]?.attacks.length ?? 0,
        };
        const prev = prevAttackCounts.current;
        prevAttackCounts.current = counts;

        const defender = prev ? [1, 2].find((n) => counts[n] > (prev[n] ?? 0)) : undefined;

        const id = window.setTimeout(() => {
            if (defender === undefined) {
                setViewTurn(state.currentTurn);
                return;
            }
            const attacks = state.boards[defender].attacks;
            const last = attacks[attacks.length - 1];
            missileSeq.current += 1;
            setViewTurn(other(defender)); // hold POV on the board being hit
            setMissile({ row: last.row, col: last.col, hit: last.hit, target: defender, seq: missileSeq.current });
        }, 0);

        return () => window.clearTimeout(id);
    }, [state]);

    const handleMissileComplete = () => {
        setMissile(null);
        setViewTurn(state?.currentTurn ?? viewTurn);
    };

    const playerNames = useMemo(
        () => session.players.reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.user.id]: p.user.name }), {}),
        [session.players],
    );
    const numberToName = useMemo(
        () => session.players.reduce<Record<number, string>>((acc, p) => ({ ...acc, [p.player_number]: p.user.name }), {}),
        [session.players],
    );

    const myPlayer = session.players.find((p) => p.user.id === auth.user.id);
    const playerNumber = myPlayer?.player_number ?? null;

    const { showOpponentDisconnectedBanner, usePluralDisconnectMessage } = useGameChannel<BattleshipState>(
        session.id,
        { players: session.players, currentUserId: auth.user.id, gameOver },
        {
            onMoveMade: (event) => {
                if (event.playerId !== auth.user.id) {
                    router.reload({ only: ['session'] });
                }
            },
            onGameStarted: () => router.reload({ only: ['session'] }),
            onGameEnded: (event) => {
                setWinner(event.winner ? playerNames[event.winner] ?? null : null);
                setGameOver(true);
                setShowGameOver(true);
                router.reload({ only: ['session'] });
            },
        },
    );

    const applyResponse = (data: MoveResponse) => {
        setState(data.state);
        if (data.game_over && data.result) {
            setWinner(data.result.winner ? playerNames[data.result.winner] ?? null : null);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    // ----- Placement handlers -----
    const allPlaced = Object.keys(placements).length === FLEET.length;
    const previewCells: Cell[] = useMemo(() => {
        if (!selectedShip || !hoverCell) return [];
        const size = FLEET.find((f) => f.name === selectedShip)!.size;
        return cellsFor(hoverCell.row, hoverCell.col, orientation, size);
    }, [selectedShip, hoverCell, orientation]);
    const previewValid = previewCells.length > 0 && placementValid(previewCells, occupiedFrom(placements, selectedShip ?? undefined));

    const handlePlaceCell = (row: number, col: number) => {
        if (!selectedShip) return;
        const size = FLEET.find((f) => f.name === selectedShip)!.size;
        const cells = cellsFor(row, col, orientation, size);
        if (!placementValid(cells, occupiedFrom(placements, selectedShip))) return;

        setPlacements((prev) => ({ ...prev, [selectedShip]: { row, col, orientation } }));
        // Auto-advance to the next unplaced ship.
        const next = FLEET.find((f) => f.name !== selectedShip && !placements[f.name]);
        setSelectedShip(next ? next.name : null);
    };

    const handleRotate = () => setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'));
    const handleRandom = () => {
        setPlacements(randomFleet());
        setSelectedShip(null);
    };
    const handleReset = () => {
        setPlacements({});
        setSelectedShip(FLEET[0].name);
    };

    const handleConfirm = async () => {
        if (!allPlaced) return;
        const ships = FLEET.map((f) => ({
            ship: f.name,
            row: placements[f.name].row,
            col: placements[f.name].col,
            orientation: placements[f.name].orientation,
        }));
        const res = await postMove(session.id, { action: 'place_fleet', ships });
        if (!res.ok) return;
        applyResponse((await res.json()) as MoveResponse);
    };

    // ----- Attack handler -----
    const handleFire = async (row: number, col: number) => {
        if (firing.current) return;
        firing.current = true;
        try {
            const res = await postMove(session.id, { action: 'attack', row, col });
            if (!res.ok) return;
            applyResponse((await res.json()) as MoveResponse);
        } finally {
            firing.current = false;
        }
    };

    if (!state || playerNumber === null) {
        return (
            <>
                <Head title={`${session.game.name} — ${session.name}`} />
                <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
                    <p className="text-slate-300">Čekanje na početak igre...</p>
                </div>
            </>
        );
    }

    const myBoard = state.boards[playerNumber];
    const iAmReady = state.phase === 'placement' && (myBoard?.ready ?? false);

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />
            <div style={{ minHeight: '100vh', background: BG, color: '#cbd5e1', paddingBottom: 40 }} className="px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <Header session={session} onLeave={handleLeave} />

                    <OpponentDisconnectedBanner show={showOpponentDisconnectedBanner} multiple={usePluralDisconnectMessage} />

                    {state.phase === 'placement' && !iAmReady && (
                        <PlacementView
                            placements={placements}
                            selectedShip={selectedShip}
                            orientation={orientation}
                            previewCells={previewCells}
                            previewValid={previewValid}
                            allPlaced={allPlaced}
                            onSelectShip={setSelectedShip}
                            onPlaceCell={handlePlaceCell}
                            onHover={(r, c) => setHoverCell({ row: r, col: c })}
                            onLeaveBoard={() => setHoverCell(null)}
                            onRotate={handleRotate}
                            onRandom={handleRandom}
                            onReset={handleReset}
                            onConfirm={handleConfirm}
                        />
                    )}

                    {state.phase === 'placement' && iAmReady && (
                        <div className="rounded-3xl border border-slate-600/50 bg-slate-900/40 p-12 text-center">
                            <p className="text-lg font-semibold text-slate-200">Flota je postavljena!</p>
                            <p className="mt-2 text-sm text-slate-400">Čekamo da protivnik rasporedi svoju flotu...</p>
                        </div>
                    )}

                    {state.phase === 'attack' && (
                        <AttackView
                            state={state}
                            playerNumber={playerNumber}
                            viewTurn={viewTurn}
                            numberToName={numberToName}
                            gameOver={gameOver}
                            animating={animating}
                            missile={missile}
                            onMissileComplete={handleMissileComplete}
                            onFire={handleFire}
                        />
                    )}
                </div>
            </div>

            {/* Hold the game-over modal back until the final missile has landed. */}
            <GameOverModal show={showGameOver && !animating} winnerName={winner} draw={false} onLeave={handleLeave} />
        </>
    );
}

const BG = 'radial-gradient(circle at 50% 30%, #1e3a5f 0%, #0f2540 55%, #020617 100%)';

function Header({ session, onLeave }: { session: SessionProp; onLeave: () => void }) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 drop-shadow">{session.game.name}</h1>
                <p className="mt-1 text-sm text-slate-300/90">{session.name}</p>
            </div>
            <div className="flex gap-3 items-center">
                <Link
                    href={route('lobby.index', session.game.slug)}
                    className="rounded-full border px-5 py-2 text-sm font-semibold"
                    style={{ color: '#cbd5e1', borderColor: 'rgba(203,213,225,0.55)', background: 'rgba(15,23,42,0.22)' }}
                >
                    Natrag u predvorje
                </Link>
                <button
                    type="button"
                    onClick={onLeave}
                    className="rounded-full px-5 py-2 text-sm font-semibold"
                    style={{ color: '#cbd5e1', background: 'rgba(15,23,42,0.62)', border: '1px solid rgba(203,213,225,0.35)' }}
                >
                    Napusti igru
                </button>
            </div>
        </div>
    );
}

function PlacementView(props: {
    placements: Record<string, Placement>;
    selectedShip: string | null;
    orientation: Orientation;
    previewCells: Cell[];
    previewValid: boolean;
    allPlaced: boolean;
    onSelectShip: (name: string) => void;
    onPlaceCell: (row: number, col: number) => void;
    onHover: (row: number, col: number) => void;
    onLeaveBoard: () => void;
    onRotate: () => void;
    onRandom: () => void;
    onReset: () => void;
    onConfirm: () => void;
}) {
    const ships = shipsFromPlacements(props.placements);

    return (
        <div className="flex flex-wrap gap-8 items-start justify-center">
            <div>
                <h2 className="text-lg font-bold text-slate-200 mb-3">Rasporedi svoju flotu</h2>
                <BattleshipBoard
                    ships={ships}
                    interactive
                    previewCells={props.previewCells}
                    previewValid={props.previewValid}
                    onCellClick={props.onPlaceCell}
                    onCellHover={props.onHover}
                    onCellLeave={props.onLeaveBoard}
                />
            </div>

            <div style={{ minWidth: 220 }}>
                <p className="text-sm font-semibold text-slate-300 mb-2">Brodovi</p>
                <div className="flex flex-col gap-2 mb-5">
                    {FLEET.map((f) => {
                        const placed = !!props.placements[f.name];
                        const selected = props.selectedShip === f.name;
                        return (
                            <button
                                key={f.name}
                                type="button"
                                onClick={() => props.onSelectShip(f.name)}
                                className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition"
                                style={{
                                    background: selected ? 'rgba(56,189,248,0.18)' : 'rgba(15,23,42,0.4)',
                                    border: `1px solid ${selected ? '#38bdf8' : 'rgba(148,163,184,0.3)'}`,
                                    opacity: placed && !selected ? 0.6 : 1,
                                }}
                            >
                                <span style={{ width: 16, height: 16, borderRadius: 4, background: SHIP_COLORS[f.name], flexShrink: 0 }} />
                                <span className="text-sm font-semibold text-slate-200 flex-1">{f.label}</span>
                                <span className="text-xs text-slate-400">{f.size}</span>
                                {placed && <span className="text-xs text-emerald-400">✓</span>}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-2">
                    <button type="button" onClick={props.onRotate} className="rounded-full px-4 py-2 text-sm font-semibold" style={btnStyle}>
                        Rotiraj ({props.orientation === 'horizontal' ? 'vodoravno' : 'okomito'})
                    </button>
                    <button type="button" onClick={props.onRandom} className="rounded-full px-4 py-2 text-sm font-semibold" style={btnStyle}>
                        Nasumično
                    </button>
                    <button type="button" onClick={props.onReset} className="rounded-full px-4 py-2 text-sm font-semibold" style={btnStyle}>
                        Poništi
                    </button>
                    <button
                        type="button"
                        onClick={props.onConfirm}
                        disabled={!props.allPlaced}
                        className="rounded-full px-4 py-2 text-sm font-bold transition"
                        style={{
                            background: props.allPlaced ? '#22c55e' : 'rgba(15,23,42,0.4)',
                            color: props.allPlaced ? '#052e16' : '#64748b',
                            cursor: props.allPlaced ? 'pointer' : 'not-allowed',
                            border: '1px solid rgba(148,163,184,0.3)',
                        }}
                    >
                        Potvrdi raspored
                    </button>
                </div>
            </div>
        </div>
    );
}

function AttackView(props: {
    state: BattleshipState;
    playerNumber: number;
    viewTurn: number;
    numberToName: Record<number, string>;
    gameOver: boolean;
    animating: boolean;
    missile: ActiveMissile | null;
    onMissileComplete: () => void;
    onFire: (row: number, col: number) => void;
}) {
    const { state, playerNumber, viewTurn, numberToName, missile } = props;
    // Both players look at the defender's board (the player NOT firing this turn).
    const targetNumber = other(viewTurn);
    const attackerNumber = viewTurn;
    const iAmAttacker = playerNumber === attackerNumber;
    const isMyTurn = !props.gameOver && !props.animating && playerNumber === state.currentTurn;

    const targetBoard = state.boards[targetNumber];
    const attackedSet = new Set(targetBoard.attacks.map((a) => `${a.row},${a.col}`));

    const boardMissile = missile && missile.target === targetNumber ? missile : null;
    const pendingCell = boardMissile ? `${boardMissile.row},${boardMissile.col}` : null;

    const turnText = iAmAttacker
        ? `Tvoj red — gađaš flotu igrača ${numberToName[targetNumber]}`
        : `${numberToName[attackerNumber]} gađa flotu igrača ${numberToName[targetNumber]}...`;

    return (
        <div className="flex flex-wrap gap-10 items-start justify-center">
            <style>{`
                @keyframes bsPovFlip {
                    0%   { opacity: 0; transform: perspective(1000px) rotateY(-16deg) translateX(22px); }
                    100% { opacity: 1; transform: perspective(1000px) rotateY(0deg) translateX(0); }
                }
            `}</style>
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <span style={{ width: 12, height: 12, borderRadius: 999, background: isMyTurn ? '#22c55e' : '#f59e0b' }} />
                    <h2 className="text-lg font-bold text-slate-200">{turnText}</h2>
                </div>
                <div key={targetNumber} style={{ animation: 'bsPovFlip .42s cubic-bezier(.4,.1,.2,1) both' }}>
                    <BattleshipBoard
                        // The defender sees their own ships; the attacker never does.
                        ships={targetNumber === playerNumber ? targetBoard.ships ?? [] : []}
                        attacks={targetBoard.attacks}
                        sunkCells={targetBoard.sunkCells}
                        interactive={isMyTurn}
                        missile={boardMissile}
                        pendingCell={pendingCell}
                        onMissileComplete={props.onMissileComplete}
                        onCellClick={
                            isMyTurn
                                ? (row, col) => {
                                      if (!attackedSet.has(`${row},${col}`)) props.onFire(row, col);
                                  }
                                : undefined
                        }
                    />
                </div>
            </div>

            <div style={{ minWidth: 220 }}>
                <p className="text-sm font-semibold text-slate-300 mb-3">
                    Flota — {numberToName[targetNumber]}
                </p>
                <div className="flex flex-col gap-2">
                    {targetBoard.fleet.map((f) => {
                        const meta = FLEET.find((x) => x.name === f.name);
                        return (
                            <div
                                key={f.name}
                                className="flex items-center gap-3 rounded-xl px-3 py-2"
                                style={{ background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.25)', opacity: f.sunk ? 0.55 : 1 }}
                            >
                                <span style={{ width: 16, height: 16, borderRadius: 4, background: SHIP_COLORS[f.name], flexShrink: 0 }} />
                                <span className="text-sm font-semibold text-slate-200 flex-1">{meta?.label ?? f.name}</span>
                                <span className="text-xs" style={{ color: f.sunk ? '#f87171' : '#94a3b8' }}>
                                    {f.sunk ? 'potopljen' : `${f.size}`}
                                </span>
                            </div>
                        );
                    })}
                    {targetBoard.fleet.length === 0 && (
                        <p className="text-xs text-slate-500">Flota je skrivena.</p>
                    )}
                </div>
                <p className="mt-4 text-xs text-slate-400">
                    Ti si igrač {playerNumber} ({numberToName[playerNumber]})
                </p>
            </div>
        </div>
    );
}

const btnStyle = {
    color: '#cbd5e1',
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(148,163,184,0.3)',
    cursor: 'pointer',
} as const;
