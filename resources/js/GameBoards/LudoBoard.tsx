import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LudoState = {
    tokens: Record<number, number[]>;
    currentTurn: number;
    pendingDice: number[];
    phase: 'roll' | 'move';
    consecutiveDoubles: number;
    players: Record<number, string>;
};

export type LudoBoardProps = {
    ludoState: LudoState;
    isYourTurn: boolean;
    disabled: boolean;
    playerNumber: number | null;
    onRoll: () => void;
    onMove: (tokenIndex: number, diceValue: number) => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 52;
const STRETCH_END = 58;
const HOME = -1;
const HOME_EXIT_DICE = 5; //izlazimo iz kuće kada kocka dobije 5

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

const START_OFFSETS: Record<number, number> = {
    1: 39, // Red - bottom right
    2: 13, // Yellow - top right
    3: 0,  // Green - top left
    4: 26, // Blue - bottom right
};

const COLORS: Record<number, { bg: string; border: string; light: string; text: string }> = {
    1: { bg: '#dc2626', border: '#991b1b', light: '#fee2e2', text: 'white' }, // Red
    2: { bg: '#ca8a04', border: '#78350f', light: '#fef9c3', text: 'white' }, // Yellow
    3: { bg: '#16a34a', border: '#14532d', light: '#dcfce7', text: 'white' }, // Green
    4: { bg: '#2563eb', border: '#1e40af', light: '#dbeafe', text: 'white' }, // Blue
};

const CENTER_COLORS: Record<number, string> = {
    1: '#fca5a5', // light red
    2: '#fde68a', // light yellow
    3: '#86efac', // light green
    4: '#93c5fd', // light blue
};

const PLAYER_LABELS: Record<number, string> = {
    1: 'Crveni',
    2: 'Žuti',
    3: 'Zeleni',
    4: 'Plavi',
};

const CELL = 44; // px
const TOKEN_SHIFT_X = CELL / 2; // half right
const TOKEN_SHIFT_Y = CELL / 2; // half down

// ─── Board geometry ───────────────────────────────────────────────────────────
const RING_CELLS: [number, number][] = [
    [6,1],[6,2],[6,3],[6,4],[6,5],
    [5,6],[4,6],[3,6],[2,6],[1,6],
    [0,6],[0,7],[0,8],

    [1,8],[2,8],[3,8],[4,8],[5,8],
    [6,9],[6,10],[6,11],[6,12],[6,13],
    [6,14],[7,14],[8,14],

    [8,13],[8,12],[8,11],[8,10],[8,9],
    [9,8],[10,8],[11,8],[12,8],[13,8],
    [14,8],[14,7],[14,6],

    [13,6],[12,6],[11,6],[10,6],[9,6],
    [8,5],[8,4],[8,3],[8,2],[8,1],
    [8,0],[7,0],[6,0],
];

// Stretch cells per player (home column, 6 steps toward center, pos 68..73)
const STRETCH: Record<number, [number, number][]> = {
    1: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
    2: [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
    3: [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
    4: [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
};

const HOME_SLOTS: Record<number, [number, number][]> = {
    1: [[10, 1], [10, 3], [12, 1], [12, 3]],
    2: [[1, 10], [1, 12], [3, 10], [3, 12]],
    3: [[1, 1], [1, 3], [3, 1], [3, 3]],
    4: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tokenCell(player: number, pos: number): [number, number] | null {
    if (pos === HOME || pos === STRETCH_END) return null;
    if (pos >= RING_SIZE) {
        const idx = pos - RING_SIZE; // 0–5
        return STRETCH[player]?.[idx] ?? null;
    }
    const absPos = (START_OFFSETS[player] + pos) % RING_SIZE;
    return RING_CELLS[absPos] ?? null;
}

function isPathBlocked(tokens: Record<number, number[]>, player: number, from: number, to: number): boolean {
    for (let pos = from + 1; pos <= to; pos++) {
        if (pos >= RING_SIZE) break;
        const abs = (START_OFFSETS[player] + pos) % RING_SIZE;
        for (const [opStr, opTokens] of Object.entries(tokens)) {
            const op = Number(opStr);
            if (op === player) continue;
            const count = opTokens.filter(opPos => {
                if (opPos < 0 || opPos >= RING_SIZE) return false;
                return (START_OFFSETS[op] + opPos) % RING_SIZE === abs;
            }).length;
            if (count >= 2) return true;
        }
    }
    return false;
}

function canMove(tokens: Record<number, number[]>, player: number, tokenIdx: number, dice: number): boolean {
    const pos = tokens[player]?.[tokenIdx];
    if (pos === undefined || pos === STRETCH_END) return false;
    if (pos === HOME) {
        if (dice !== HOME_EXIT_DICE) return false;
        return !isPathBlocked(tokens, player, HOME, 0);
    }
    if (pos + dice > STRETCH_END) return false;
    return !isPathBlocked(tokens, player, pos, pos + dice);
}

// Returns every intermediate board position between fromPos and toPos
function buildPath(fromPos: number, toPos: number): number[] {
    const steps: number[] = [];
    if (fromPos === HOME) {
        for (let p = 0; p <= toPos; p++) steps.push(p);
    } else {
        for (let p = fromPos + 1; p <= toPos; p++) steps.push(p);
    }
    return steps;
}

// ─── Token SVG (figura čovjeka) ───────────────────────────────────────────────

function TokenFigure({ color, size = 26, legs = true }: { color: string; size?: number; legs?: boolean }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="5" r="3.2" fill={color} stroke="white" strokeWidth="1.2" />
            <path d="M7 11.5 C7 9 9 8 12 8 C15 8 17 9 17 11.5 L16 17 L8 17 Z" fill={color} stroke="white" strokeWidth="1" />
            {legs && <>
                <line x1="9" y1="17" x2="8" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
                <line x1="15" y1="17" x2="16" y2="22" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
            </>}
        </svg>
    );
}

// ─── Dice face SVG ────────────────────────────────────────────────────────────

const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DieFace({ value, size = 52 }: { value: number; size?: number }) {
    const dots = DOT_POSITIONS[Math.min(Math.max(value, 1), 6)] ?? DOT_POSITIONS[1];
    const r = size * 0.12;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            <rect x="2" y="2" width="96" height="96" rx="16" fill="white" stroke="#d1d5db" strokeWidth="3" />
            {dots.map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={r} fill="#18181b" />
            ))}
        </svg>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LudoBoard({ ludoState, isYourTurn, disabled, playerNumber, onRoll, onMove }: LudoBoardProps) {
    const { tokens, pendingDice, phase, currentTurn } = ludoState;

    const [selectedToken, setSelectedToken] = useState<number | null>(null);
    const [rolling, setRolling] = useState(false);
    const [shownDice, setShownDice] = useState<number[]>([]);
    const prevPhaseRef = useRef<string>(phase);

    // Animation: track displayed positions separately from server state
    const [displayTokens, setDisplayTokens] = useState<Record<number, number[]>>(tokens);
    const prevTokensRef = useRef<Record<number, number[]>>(tokens);
    const animatingRef = useRef(false);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep shownDice updated when we move to 'move' phase, reset on turn change
    useEffect(() => {
        if (phase === 'move' && pendingDice.length > 0) {
            setShownDice(pendingDice.slice(0, 2));
        } else if (phase === 'roll') {
            setShownDice([]);
        }
    }, [phase, pendingDice, currentTurn]);

    // Step-by-step token animation when server sends new positions
    useEffect(() => {
        const prev = prevTokensRef.current;
        const next = tokens;

        // Find which token moved
        let movedPlayer: number | null = null;
        let movedIdx: number | null = null;
        let fromPos: number | null = null;
        let toPos: number | null = null;

        for (const [pStr, pTokens] of Object.entries(next)) {
            const p = Number(pStr);
            const prevTokens = prev[p] ?? [];
            for (let i = 0; i < pTokens.length; i++) {
                if (pTokens[i] !== prevTokens[i] && pTokens[i] !== HOME) {
                    movedPlayer = p;
                    movedIdx = i;
                    fromPos = prevTokens[i] ?? HOME;
                    toPos = pTokens[i];
                    break;
                }
            }
            if (movedPlayer !== null) break;
        }

        prevTokensRef.current = next;

        if (movedPlayer === null || movedIdx === null || fromPos === null || toPos === null) {
            // No movement (e.g. token sent home after capture) — just sync display
            setDisplayTokens(next);
            return;
        }

        // Build intermediate steps and animate one step at a time
        const path = buildPath(fromPos, toPos);
        if (path.length === 0) {
            setDisplayTokens(next);
            return;
        }

        // Cancel any in-progress animation before starting a new one
        if (animationTimeoutRef.current !== null) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }

        animatingRef.current = true;
        let step = 0;
        const STEP_MS = 160;

        const tick = () => {
            const currentPos = path[step];
            setDisplayTokens(prev => {
                const copy: Record<number, number[]> = {};
                for (const [k, v] of Object.entries(prev)) copy[Number(k)] = [...v];
                copy[movedPlayer!][movedIdx!] = currentPos;
                return copy;
            });
            step++;
            if (step < path.length) {
                animationTimeoutRef.current = setTimeout(tick, STEP_MS);
            } else {
                setDisplayTokens(next);
                animatingRef.current = false;
                animationTimeoutRef.current = null;
            }
        };

        animationTimeoutRef.current = setTimeout(tick, STEP_MS);
    }, [tokens]);

    // Reset selection when turn or phase changes
    useEffect(() => {
        setSelectedToken(null);
        prevPhaseRef.current = phase;
    }, [currentTurn, phase]);

    // Auto-select token if only one is movable
    useEffect(() => {
        if (!isYourTurn || phase !== 'move' || playerNumber === null) return;
        const myTokens = tokens[playerNumber] ?? [];
        const movable: number[] = [];
        myTokens.forEach((_, idx) => {
            if (pendingDice.some(d => canMove(tokens, playerNumber, idx, d))) {
                movable.push(idx);
            }
        });
        if (movable.length === 1) {
            setSelectedToken(movable[0]);
        }
    }, [phase, pendingDice, isYourTurn, playerNumber, tokens]);

    const handleRoll = () => {
        if (!isYourTurn || phase !== 'roll' || disabled) return;
        setRolling(true);
        onRoll();
        setTimeout(() => setRolling(false), 600);
    };

    const handleTokenClick = (tokenIdx: number) => {
        if (!isYourTurn || phase !== 'move' || playerNumber === null) return;
        const movable = pendingDice.some(d => canMove(tokens, playerNumber, tokenIdx, d));
        if (!movable) return;
        setSelectedToken(prev => (prev === tokenIdx ? null : tokenIdx));
    };

    const handleDiceClick = (diceValue: number, diceIndex: number) => {
        if (selectedToken === null || !isYourTurn || phase !== 'move' || playerNumber === null) return;
        if (!canMove(tokens, playerNumber, selectedToken, diceValue)) return;
        onMove(selectedToken, diceValue);
        setSelectedToken(null);
    };

    // Which of my tokens are movable with any pending die
    const movableTokens = new Set<number>();
    if (isYourTurn && phase === 'move' && playerNumber !== null) {
        (tokens[playerNumber] ?? []).forEach((_, idx) => {
            if (pendingDice.some(d => canMove(tokens, playerNumber, idx, d))) {
                movableTokens.add(idx);
            }
        });
    }

    // Collect all tokens on board cells using displayTokens (animated positions)
    type BoardToken = { player: number; idx: number };
    const cellMap = new Map<string, BoardToken[]>();

    for (const [pStr, pTokens] of Object.entries(displayTokens)) {
        const p = Number(pStr);
        pTokens.forEach((pos, idx) => {
            const cell = tokenCell(p, pos);
            if (!cell) return;
            const key = `${cell[0]},${cell[1]}`;
            if (!cellMap.has(key)) cellMap.set(key, []);
            cellMap.get(key)!.push({ player: p, idx });
        });
    }

    // Build the set of visible cells for the board background
    const pathSet = new Set<string>(RING_CELLS.map(([r, c]) => `${r},${c}`));
    for (const cells of Object.values(STRETCH)) {
        for (const [r, c] of cells) pathSet.add(`${r},${c}`);
    }
    // Center (finish area)
    for (let r = 6; r <= 8; r++)
        for (let c = 6; c <= 8; c++)
            pathSet.add(`${r},${c}`);
    // Home zones
    for (let r = 9; r <= 14; r++) for (let c = 0; c <= 5; c++) pathSet.add(`${r},${c}`);
    for (let r = 0; r <= 5; r++) for (let c = 9; c <= 14; c++) pathSet.add(`${r},${c}`);
    for (let r = 0; r <= 5; r++) for (let c = 0; c <= 5; c++) pathSet.add(`${r},${c}`);
    for (let r = 9; r <= 14; r++) for (let c = 9; c <= 14; c++) pathSet.add(`${r},${c}`);

    function cellBackground(row: number, col: number): string {
        // Home zones — border ring is colored, inner 4×4 is white
        if (row >= 9 && row <= 14 && col >= 0 && col <= 5) {
            const inner = row >= 10 && row <= 13 && col >= 1 && col <= 4;
            return inner ? 'white' : '#fca5a5';
        }
        if (row >= 0 && row <= 5 && col >= 9 && col <= 14) {
            const inner = row >= 1 && row <= 4 && col >= 10 && col <= 13;
            return inner ? 'white' : '#fde68a';
        }
        if (row >= 0 && row <= 5 && col >= 0 && col <= 5) {
            const inner = row >= 1 && row <= 4 && col >= 1 && col <= 4;
            return inner ? 'white' : '#86efac';
        }
        if (row >= 9 && row <= 14 && col >= 9 && col <= 14) {
            const inner = row >= 10 && row <= 13 && col >= 10 && col <= 13;
            return inner ? 'white' : '#93c5fd';
        }
        

        // Center finish triangle region
        if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return '#f8fafc';
        // Stretch corridors
        for (const [p, cells] of Object.entries(STRETCH)) {
            if (cells.some(([r, c]) => r === row && c === col)) {
                return COLORS[Number(p)].light;
            }
        }
        // Player entry (colored start square)
        const ringIdx = RING_CELLS.findIndex(([r, c]) => r === row && c === col);
        if (ringIdx !== -1) {
            if (ringIdx === START_OFFSETS[1]) return '#fca5a5'; // Crveni
            if (ringIdx === START_OFFSETS[2]) return '#fde68a'; // Žuti
            if (ringIdx === START_OFFSETS[3]) return '#86efac'; // Zeleni
            if (ringIdx === START_OFFSETS[4]) return '#93c5fd'; // Plavi
        }
        return 'white';
    }

    function cellContent(row: number, col: number): React.ReactNode {
        const ringIdx = RING_CELLS.findIndex(([r, c]) => r === row && c === col);
        if (ringIdx !== -1 && SAFE_SQUARES.includes(ringIdx) && ![0, 13, 26, 39].includes(ringIdx)) {
            return <span style={{ fontSize: 16, opacity: 0.45, lineHeight: 1 }}>★</span>;
        }
        // Center diagonal lines (finish area indicator)
        if (row === 7 && col === 7) return <span style={{ fontSize: 14, opacity: 0.3 }}>⬛</span>;
        return null;
    }

    const boardW = 15 * CELL;
    const boardH = 15 * CELL;

    return (
        <div style={{ fontFamily: 'Manrope, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative' }}>
            <style>{`
                @keyframes diceRoll {
                    0%   { transform: rotate(0deg) scale(1); }
                    20%  { transform: rotate(-15deg) scale(1.1); }
                    40%  { transform: rotate(20deg) scale(0.95); }
                    60%  { transform: rotate(-10deg) scale(1.05); }
                    80%  { transform: rotate(8deg) scale(1); }
                    100% { transform: rotate(0deg) scale(1); }
                }
                @keyframes tokenPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.25); }
                    50%      { box-shadow: 0 0 0 5px rgba(0,0,0,0.10); transform: scale(1.12); }
                }
                @keyframes tokenMove {
                    0%   { transform: scale(1); }
                    50%  { transform: scale(1.25); }
                    100% { transform: scale(1); }
                }
            `}</style>

            {/* ── Board ── */}
            <div style={{
                position: 'relative',
                width: boardW,
                height: boardH,
                borderRadius: 12,
                background: '#e2e8f0',
                flexShrink: 0,
            }}>

                {/* Grid cells */}
                {Array.from({ length: 15 }, (_, row) =>
                    Array.from({ length: 15 }, (_, col) => {
                        const key = `${row},${col}`;
                        if (!pathSet.has(key)) return null;
                        const bg = cellBackground(row, col);
                        const content = cellContent(row, col);
                        const isHomeZone = (row <= 5 && col <= 5) || (row <= 5 && col >= 9) || (row >= 9 && col <= 5) || (row >= 9 && col >= 9);
                        return (
                            <div
                                key={key}
                                style={{
                                    position: 'absolute',
                                    left: col * CELL,
                                    top: row * CELL,
                                    width: CELL,
                                    height: CELL,
                                    background: bg,
                                    border: isHomeZone ? 'none' : '1px solid #cbd5e1',
                                    boxSizing: 'border-box',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden', 
                                }}
                            >
                                {row >= 6 && row <= 8 && col >= 6 && col <= 8 ? ( <>
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: '#f8fafc',
                                    }}
                                />
                                {row === 6 && col === 6 && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[2], // yellow
                                                clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[3], // green
                                                clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
                                            }}
                                        />
                                    </>
                                )}

                                {row === 6 && col === 7 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: CENTER_COLORS[2], // yellow
                                        }}
                                    />
                                )}

                                {/* 6,8 - pola žuto, pola plavo */}
                                {row === 6 && col === 8 && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[2], // yellow
                                                clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[4], // blue
                                                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                                            }}
                                        />
                                    </>
                                )}

                                {row === 7 && col === 6 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: CENTER_COLORS[3], // green
                                        }}
                                    />
                                )}

                                {row === 7 && col === 7 && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[2], // yellow
                                                clipPath: 'polygon(0 0, 100% 0, 50% 50%)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[4], // blue
                                                clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[1], // red
                                                clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[3], // green
                                                clipPath: 'polygon(0 0, 0 100%, 50% 50%)',
                                            }}
                                        />
                                    </>
                                )}

                                {row === 7 && col === 8 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: CENTER_COLORS[4], // blue
                                        }}
                                    />
                                )}

                                {row === 8 && col === 6 && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[3], // green
                                                clipPath: 'polygon(0 0, 0 100%, 100% 0)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[1], // red
                                                clipPath: 'polygon(0 100%, 100% 100%, 100% 0)',
                                            }}
                                        />
                                    </>
                                )}

                                {row === 8 && col === 7 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: CENTER_COLORS[1], // red
                                        }}
                                    />
                                )}

                                {row === 8 && col === 8 && (
                                    <>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[4], // blue
                                                clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: CENTER_COLORS[1], // red
                                                clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
                                            }}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            content
                        )}
                            </div>
                        );
                    })
                )}

                {/* Home inner circles + tokens at HOME */}
                {([1, 2, 3, 4] as const).map(pNum => {
                    const c = COLORS[pNum];
                    const homeTokenIdxs = (displayTokens[pNum] ?? [])
                        .map((pos, idx) => ({ pos, idx }))
                        .filter(({ pos }) => pos === HOME);

                    return HOME_SLOTS[pNum].map(([slotRow, slotCol], slotIdx) => {
                        const tokenHere = homeTokenIdxs[slotIdx];
                        const isMineThere = playerNumber === pNum && tokenHere !== undefined;
                        const isMovable = isMineThere && movableTokens.has(tokenHere.idx);
                        const isSelected = isMineThere && selectedToken === tokenHere.idx;

                        return (
                            <div
                                key={`hs-${pNum}-${slotIdx}`}
                                style={{
                                    position: 'absolute',
                                    left: slotCol * CELL + TOKEN_SHIFT_X,
                                    top: slotRow * CELL + TOKEN_SHIFT_Y,
                                    width: CELL,
                                    height: CELL,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {tokenHere !== undefined && (
                                    <button
                                        type="button"
                                        onClick={() => handleTokenClick(tokenHere.idx)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: isMovable ? 'pointer' : 'default',
                                            animation: isMovable && !isSelected ? 'tokenPulse 1.2s ease-in-out infinite' : undefined,
                                            transition: 'transform 0.15s',
                                            transform: isSelected ? 'scale(1.2)' : undefined,
                                            outline: isSelected ? `3px solid ${c.bg}` : 'none',
                                            borderRadius: 4,
                                            display: 'flex',
                                        }}
                                    >
                                        <TokenFigure color={c.bg} size={CELL - 4} legs={false} />
                                    </button>
                                )}
                            </div>
                        );
                    });
                })}

                {/* Tokens on the path / stretch */}
                {Array.from(cellMap.entries()).map(([key, cellTokens]) => {
                    const [row, col] = key.split(',').map(Number);
                    const n = cellTokens.length;
                    // Offset positions for stacked tokens
                    const offsets: [number, number][] =
                        n === 1 ? [[0, 0]] :
                        n === 2 ? [[-7, -7], [7, 7]] :
                        n === 3 ? [[-7, -7], [7, -7], [0, 8]] :
                                  [[-7, -7], [7, -7], [-7, 7], [7, 7]];

                    return cellTokens.map((bt, i) => {
                        const c = COLORS[bt.player];
                        const isMine = playerNumber === bt.player;
                        const isMovable = isMine && movableTokens.has(bt.idx);
                        const isSelected = isMine && selectedToken === bt.idx;
                        const [ox, oy] = offsets[i] ?? [0, 0];
                        const size = 36;

                        return (
                            <button
                                key={`pt-${bt.player}-${bt.idx}`}
                                type="button"
                                onClick={() => handleTokenClick(bt.idx)}
                                title={`${PLAYER_LABELS[bt.player]} ${bt.idx + 1}`}
                                style={{
                                    position: 'absolute',
                                    left: col * CELL + CELL / 2 + ox - size / 2,
                                    top: row * CELL + CELL / 2 + oy - size / 2,
                                    width: size,
                                    height: size,
                                    borderRadius: '50%',
                                    background: c.bg,
                                    border: isSelected ? `3px solid white` : `2px solid ${c.border}`,
                                    outline: isSelected ? `3px solid ${c.bg}` : undefined,
                                    cursor: isMovable ? 'pointer' : 'default',
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: isSelected ? 30 : 10,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                    animation: isMovable && !isSelected ? 'tokenPulse 1.2s ease-in-out infinite' : undefined,
                                    transition: 'transform 0.2s',
                                    transform: isSelected ? 'scale(1.2)' : undefined,
                                }}
                            >
                                <TokenFigure color={c.bg} size={size} />
                            </button>
                        );
                    });
                })}

                {/* Finished tokens shown in center */}
                {([1, 2, 3, 4] as const).flatMap(pNum => {
                    const c = COLORS[pNum];
                    const finished = (displayTokens[pNum] ?? []).filter(p => p === STRETCH_END);
                    const centerOffsets: [number, number][] = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
                    return finished.map((_, i) => {
                        const [ox, oy] = centerOffsets[i] ?? [0, 0];
                        return (
                            <div
                                key={`fin-${pNum}-${i}`}
                                style={{
                                    position: 'absolute',
                                    left: 7 * CELL + CELL / 2 + ox - 10,
                                    top: 7 * CELL + CELL / 2 + oy - 10,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: c.bg,
                                    border: `2px solid ${c.border}`,
                                    zIndex: 5,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                                }}
                            />
                        );
                    });
                })}

                {/* ── Board corner overlay ── */}
                <img
                    src="/images/ludo_game_props/ludo_board_corner.svg"
                    alt=""
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: boardW + 12,
                        height: boardH + 4,
                        pointerEvents: 'none',
                        zIndex: 3,
                        display: 'block',
                    }}
                />
            </div>

            {/* ── Controls ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%', maxWidth: 660 }}>

                {/* Dice + roll button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>

                    {/* Dice display */}
                    {shownDice.length > 0 && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {(phase === 'move' ? pendingDice : shownDice).map((val, i) => {
                                const isBonus = val > 6;
                                const isClickable = phase === 'move' && selectedToken !== null && isYourTurn &&
                                    !isBonus && playerNumber !== null && canMove(tokens, playerNumber, selectedToken, val);
                                const isUsable = phase === 'move' && selectedToken !== null && isYourTurn &&
                                    !isBonus && playerNumber !== null && canMove(tokens, playerNumber, selectedToken, val);

                                return (
                                    <button
                                        key={`dice-${i}-${val}`}
                                        type="button"
                                        onClick={() => handleDiceClick(val, i)}
                                        disabled={!isUsable}
                                        title={isBonus ? `Bonus ${val} polja` : `Iskoristi kocku: ${val}`}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: isUsable ? 'pointer' : 'default',
                                            opacity: selectedToken !== null && !isUsable ? 0.3 : phase === 'move' && selectedToken === null ? 0.65 : 1,
                                            filter: selectedToken !== null && !isUsable ? 'grayscale(1)' : 'none',
                                            animation: rolling ? 'diceRoll 0.6s ease-out' : undefined,
                                            transition: 'transform 0.15s, opacity 0.2s',
                                            transform: isClickable ? 'scale(1.08)' : undefined,
                                        }}
                                    >
                                        {isBonus ? (
                                            <div style={{
                                                width: 52, height: 52, borderRadius: 10,
                                                background: '#fef3c7', border: '2px solid #d97706',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, fontSize: 15, color: '#92400e',
                                                flexDirection: 'column', lineHeight: 1.1,
                                            }}>
                                                <span style={{ fontSize: 11 }}>+bonus</span>
                                                <span>{val}</span>
                                            </div>
                                        ) : (
                                            <DieFace value={val} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {phase === 'roll' && (
                        <button
                            type="button"
                            onClick={handleRoll}
                            disabled={!isYourTurn || disabled}
                            style={{
                                padding: '13px 40px',
                                borderRadius: 100,
                                background: isYourTurn && !disabled ? '#18181b' : '#9ca3af',
                                color: 'white',
                                border: 'none',
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: isYourTurn && !disabled ? 'pointer' : 'not-allowed',
                                letterSpacing: 0.3,
                                boxShadow: isYourTurn && !disabled ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
                                transition: 'background 0.2s, box-shadow 0.2s',
                            }}
                        >
                            {isYourTurn ? '🎲 Baci kocke' : `${PLAYER_LABELS[currentTurn] ?? 'Igrač'} baca...`}
                        </button>
                    )}

                    {phase === 'move' && selectedToken === null && isYourTurn && (
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                            Klikni žeton koji želiš pomaknuti, zatim odaberi kocku
                        </p>
                    )}
                    {phase === 'move' && selectedToken !== null && isYourTurn && (
                        <p style={{ margin: 0, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                            Odabran žeton {selectedToken + 1} — klikni kocku za pomak
                        </p>
                    )}
                    {phase === 'move' && !isYourTurn && (
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                            {PLAYER_LABELS[currentTurn] ?? 'Igrač'} odabire potez...
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}