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

function canMove(tokens: Record<number, number[]>, player: number, tokenIdx: number, dice: number): boolean {
    const pos = tokens[player]?.[tokenIdx];
    if (pos === undefined || pos === STRETCH_END) return false;
    if (pos === HOME) return dice === HOME_EXIT_DICE;
    if (pos + dice > STRETCH_END) return false;
    return true;
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

    // Keep shownDice updated when we move to 'move' phase
    useEffect(() => {
        if (phase === 'move' && pendingDice.length > 0) {
            setShownDice(pendingDice.slice(0, 2));
        }
    }, [phase, pendingDice]);

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

    // Collect all tokens on board cells, grouped by cell
    type BoardToken = { player: number; idx: number };
    const cellMap = new Map<string, BoardToken[]>();

    for (const [pStr, pTokens] of Object.entries(tokens)) {
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
        // Home zones
        if (row >= 9 && row <= 14 && col >= 0 && col <= 5) return COLORS[1].light;
        if (row >= 0 && row <= 5 && col >= 9 && col <= 14) return COLORS[2].light;
        if (row >= 0 && row <= 5 && col >= 0 && col <= 5) return COLORS[3].light;
        if (row >= 9 && row <= 14 && col >= 9 && col <= 14) return COLORS[4].light;
        

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
        <div style={{ fontFamily: 'Manrope, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
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
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                overflow: 'hidden',
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
                                    border: '1px solid #cbd5e1',
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
                    const homeTokenIdxs = (tokens[pNum] ?? [])
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
                                {/* Slot ring */}
                                <div style={{
                                    width: CELL - 6,
                                    height: CELL - 6,
                                    borderRadius: '50%',
                                    border: `3px solid ${c.bg}`,
                                    background: 'rgba(255,255,255,0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    {tokenHere !== undefined && (
                                        <button
                                            type="button"
                                            onClick={() => handleTokenClick(tokenHere.idx)}
                                            style={{
                                                width: CELL - 18,
                                                height: CELL - 18,
                                                borderRadius: '50%',
                                                background: c.bg,
                                                border: isSelected ? `3px solid white` : `2px solid ${c.border}`,
                                                outline: isSelected ? `3px solid ${c.bg}` : undefined,
                                                cursor: isMovable ? 'pointer' : 'default',
                                                animation: isMovable && !isSelected ? 'tokenPulse 1.2s ease-in-out infinite' : undefined,
                                                color: 'white',
                                                fontWeight: 800,
                                                fontSize: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'transform 0.15s',
                                                transform: isSelected ? 'scale(1.15)' : undefined,
                                            }}
                                        >
                                            {tokenHere.idx + 1}
                                        </button>
                                    )}
                                </div>
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
                        const size = 26;

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
                                {bt.idx + 1}
                            </button>
                        );
                    });
                })}

                {/* Finished tokens shown in center */}
                {([1, 2, 3, 4] as const).flatMap(pNum => {
                    const c = COLORS[pNum];
                    const finished = (tokens[pNum] ?? []).filter(p => p === STRETCH_END);
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
                                    playerNumber !== null && canMove(tokens, playerNumber, selectedToken, val);

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
                                            opacity: phase === 'move' && selectedToken === null ? 0.65 : 1,
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

                {/* Player status row */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {Object.entries(tokens).map(([pStr, pTokens]) => {
                        const pNum = Number(pStr);
                        const c = COLORS[pNum];
                        const atHome = pTokens.filter(p => p === HOME).length;
                        const finished = pTokens.filter(p => p === STRETCH_END).length;
                        const onBoard = pTokens.length - atHome - finished;
                        const isActive = currentTurn === pNum;
                        const isMe = playerNumber === pNum;

                        return (
                            <div
                                key={pNum}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 16px',
                                    borderRadius: 100,
                                    background: isActive ? c.bg : '#f1f5f9',
                                    color: isActive ? 'white' : '#374151',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    border: `2px solid ${isActive ? c.border : '#e2e8f0'}`,
                                    transition: 'all 0.25s',
                                    boxShadow: isActive ? `0 4px 12px ${c.bg}55` : undefined,
                                }}
                            >
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: isActive ? 'white' : c.bg,
                                    border: `2px solid ${isActive ? 'rgba(255,255,255,0.6)' : c.border}`,
                                    flexShrink: 0,
                                }} />
                                <span>{PLAYER_LABELS[pNum]}{isMe ? ' (ti)' : ''}</span>
                                <span style={{ opacity: 0.8, fontSize: 12 }}>
                                    {finished > 0 && `✓${finished} `}
                                    {onBoard > 0 && `▲${onBoard} `}
                                    {atHome > 0 && `⌂${atHome}`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}