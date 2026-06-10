import { useEffect, useRef, useState } from 'react';

export type ConnectFourState = {
    board: number[][];
    currentTurn: number;
    players: Record<string, string>;
};

export type ConnectFourBoardProps = {
    board: number[][];
    isYourTurn: boolean;
    disabled: boolean;
    playerNumber: number | null;
    onMove: (col: number) => void;
};

const CELL = 74;
const GAP = 10;
const PAD = 14;

const DISC = {
    1: { face: 'radial-gradient(circle at 35% 30%, #ff7a82, #ef2b3a 58%, #b3121f)', glow: 'rgba(255,60,80,0.7)' },
    2: { face: 'radial-gradient(circle at 35% 30%, #ffe07a, #f7c021 58%, #c8920a)', glow: 'rgba(255,205,40,0.7)' },
} as const;

function cellAt(board: number[][] | undefined, row: number, col: number): number {
    return board?.[row]?.[col] ?? 0;
}

/** Find the winning run of four so it can be highlighted. Mirrors the engine's win check on the client. */
function winningCells(board: number[][] | undefined): Set<string> {
    const empty = new Set<string>();
    if (!board) return empty;
    const rows = board.length;
    const cols = board[0]?.length ?? 0;
    const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
    ];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const v = cellAt(board, r, c);
            if (v === 0) continue;
            for (const [dr, dc] of dirs) {
                const cells: string[] = [`${r},${c}`];
                let rr = r + dr;
                let cc = c + dc;
                while (cellAt(board, rr, cc) === v && cells.length < 4) {
                    cells.push(`${rr},${cc}`);
                    rr += dr;
                    cc += dc;
                }
                if (cells.length === 4) return new Set(cells);
            }
        }
    }
    return empty;
}

export default function ConnectFourBoard({ board, isYourTurn, disabled, playerNumber, onMove }: ConnectFourBoardProps) {
    const interactive = isYourTurn && !disabled;
    const rows = board?.length ?? 6;
    const cols = board?.[0]?.length ?? 7;

    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const prevBoardRef = useRef<number[][] | null>(null);
    const [dropped, setDropped] = useState<{ key: string; distance: number } | null>(null);

    // Detect the single newly-placed token so we can animate it falling into place.
    useEffect(() => {
        const prev = prevBoardRef.current;
        if (prev && board) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if ((prev[r]?.[c] ?? 0) === 0 && cellAt(board, r, c) !== 0) {
                        setDropped({ key: `${r},${c}`, distance: (r + 1) * (CELL + GAP) });
                    }
                }
            }
        }
        prevBoardRef.current = board ? board.map((row) => [...row]) : null;
    }, [board, rows, cols]);

    const win = winningCells(board);
    const boardW = cols * CELL + (cols - 1) * GAP + PAD * 2;
    const boardH = rows * CELL + (rows - 1) * GAP + PAD * 2;

    const isColumnFull = (col: number) => cellAt(board, 0, col) !== 0;
    const myDisc = playerNumber === 2 ? DISC[2] : DISC[1];

    const handleColumn = (col: number) => {
        if (!interactive || isColumnFull(col)) return;
        onMove(col);
    };

    return (
        <>
            <style>{`
                @keyframes c4Drop {
                    0% { transform: translateY(var(--c4-drop)); }
                    80% { transform: translateY(0); }
                    90% { transform: translateY(-6px); }
                    100% { transform: translateY(0); }
                }
                @keyframes c4WinPulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); transform: scale(1); }
                    50% { box-shadow: 0 0 22px 4px rgba(255,255,255,0.85); transform: scale(1.06); }
                }
            `}</style>

            <div className="flex justify-center" style={{ perspective: 1400 }}>
                <div
                    style={{
                        width: boardW,
                        height: boardH,
                        padding: PAD,
                        borderRadius: 26,
                        background: 'linear-gradient(160deg, #2f63e6 0%, #1f49c4 45%, #14328f 100%)',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -6px 16px rgba(0,0,0,0.35)',
                        transform: 'rotateX(8deg)',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
                        columnGap: GAP,
                    }}
                >
                    {Array.from({ length: cols }).map((_, col) => {
                        const full = isColumnFull(col);
                        const clickable = interactive && !full;
                        const hovered = hoverCol === col && clickable;

                        return (
                            <div
                                key={`col-${col}`}
                                onMouseEnter={() => setHoverCol(col)}
                                onMouseLeave={() => setHoverCol((c) => (c === col ? null : c))}
                                onClick={() => handleColumn(col)}
                                style={{
                                    display: 'grid',
                                    gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
                                    rowGap: GAP,
                                    cursor: clickable ? 'pointer' : 'default',
                                    borderRadius: 16,
                                    background: hovered ? 'rgba(255,255,255,0.10)' : 'transparent',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {Array.from({ length: rows }).map((_, row) => {
                                    const value = cellAt(board, row, col);
                                    const disc = DISC[value as 1 | 2];
                                    const key = `${row},${col}`;
                                    const isWin = win.has(key);
                                    // Ghost preview sits in the lowest empty slot of the hovered column.
                                    const lowestEmpty = (() => {
                                        for (let r = rows - 1; r >= 0; r--) {
                                            if (cellAt(board, r, col) === 0) return r;
                                        }
                                        return -1;
                                    })();
                                    const showGhost = hovered && row === lowestEmpty;

                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                width: CELL,
                                                height: CELL,
                                                borderRadius: '50%',
                                                background: 'radial-gradient(circle at 50% 50%, #0d2266 0%, #0d2266 62%, #1c44b0 64%)',
                                                boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(255,255,255,0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            {disc ? (
                                                <div
                                                    style={{
                                                        width: CELL - 12,
                                                        height: CELL - 12,
                                                        borderRadius: '50%',
                                                        background: disc.face,
                                                        boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.35), inset 0 3px 6px rgba(255,255,255,0.5), 0 2px 6px rgba(0,0,0,0.4)${isWin ? `, 0 0 18px ${disc.glow}` : ''}`,
                                                        // @ts-expect-error CSS custom property for the drop distance
                                                        '--c4-drop': `-${dropped?.distance ?? 0}px`,
                                                        animation:
                                                            dropped?.key === key
                                                                ? 'c4Drop 0.42s cubic-bezier(0.34,1.4,0.64,1) both'
                                                                : isWin
                                                                    ? 'c4WinPulse 1s ease-in-out infinite'
                                                                    : undefined,
                                                    }}
                                                />
                                            ) : showGhost ? (
                                                <div
                                                    style={{
                                                        width: CELL - 16,
                                                        height: CELL - 16,
                                                        borderRadius: '50%',
                                                        background: myDisc.face,
                                                        opacity: 0.35,
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
