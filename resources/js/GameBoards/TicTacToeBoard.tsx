export type TicTacToeState = {
    board: number[][];
    currentTurn: number;
    players: Record<string, string>;
};

export type TicTacToeBoardProps = {
    board: number[][];
    isYourTurn: boolean;
    disabled: boolean;
    onMove: (row: number, col: number) => void;
};

const SIZE = 3;
const CELL = 116;
const GAP = 14;

const MARK = {
    1: { stroke: '#ff5d6c', glow: 'rgba(255,60,80,0.55)' }, // X — player 1
    2: { stroke: '#4cb5ff', glow: 'rgba(60,160,255,0.55)' }, // O — player 2
} as const;

const LINES: [number, number][][] = [
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]],
];

/** Reads a cell defensively so a momentarily empty/short/undefined board never blanks the grid. */
function cellAt(board: number[][] | undefined, row: number, col: number): number {
    return board?.[row]?.[col] ?? 0;
}

function winningLine(board: number[][]): [number, number][] | null {
    for (const line of LINES) {
        const [a, b, c] = line;
        const v = cellAt(board, a[0], a[1]);
        if (v !== 0 && v === cellAt(board, b[0], b[1]) && v === cellAt(board, c[0], c[1])) {
            return line;
        }
    }
    return null;
}

/** X (1) and O (2) drawn as stroked SVG so they read crisp and pick up the player colour + glow. */
function Mark({ value, size }: { value: number; size: number }) {
    const meta = MARK[value as 1 | 2];
    if (!meta) return null;

    const sw = size * 0.13;
    const pad = size * 0.24;
    const filter = `drop-shadow(0 0 12px ${meta.glow})`;

    if (value === 1) {
        const len = (size - pad * 2) * 1.42;
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter }}>
                <line
                    x1={pad} y1={pad} x2={size - pad} y2={size - pad}
                    stroke={meta.stroke} strokeWidth={sw} strokeLinecap="round"
                    style={{ strokeDasharray: len, strokeDashoffset: len, animation: 'ttDraw 0.28s ease-out forwards' }}
                />
                <line
                    x1={size - pad} y1={pad} x2={pad} y2={size - pad}
                    stroke={meta.stroke} strokeWidth={sw} strokeLinecap="round"
                    style={{ strokeDasharray: len, strokeDashoffset: len, animation: 'ttDraw 0.28s ease-out 0.1s forwards' }}
                />
            </svg>
        );
    }

    const r = (size - pad * 2) / 2;
    const circ = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter }}>
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={meta.stroke} strokeWidth={sw} strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ strokeDasharray: circ, strokeDashoffset: circ, animation: 'ttDraw 0.36s ease-out forwards' }}
            />
        </svg>
    );
}

export default function TicTacToeBoard({ board, isYourTurn, disabled, onMove }: TicTacToeBoardProps) {
    const interactive = isYourTurn && !disabled;
    const win = winningLine(board);
    const winSet = new Set(win?.map(([r, c]) => `${r},${c}`));
    const boardPx = SIZE * CELL + (SIZE - 1) * GAP;

    const handleClick = (row: number, col: number) => {
        if (!interactive || cellAt(board, row, col) !== 0) return;
        onMove(row, col);
    };

    return (
        <>
            <style>{`
                @keyframes ttDraw { to { stroke-dashoffset: 0; } }
                @keyframes ttPop {
                    0% { opacity: 0; transform: scale(0.55); }
                    70% { transform: scale(1.06); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div className="flex justify-center">
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`,
                        gap: GAP,
                        width: boardPx,
                    }}
                >
                    {Array.from({ length: SIZE }).flatMap((_, row) =>
                        Array.from({ length: SIZE }).map((_, col) => {
                            const value = cellAt(board, row, col);
                            const isEmpty = value === 0;
                            const clickable = interactive && isEmpty;
                            const isWinCell = winSet.has(`${row},${col}`);

                            return (
                                <button
                                    key={`${row}-${col}`}
                                    type="button"
                                    onClick={() => handleClick(row, col)}
                                    disabled={!clickable}
                                    className="group relative flex items-center justify-center rounded-2xl transition-transform duration-150"
                                    style={{
                                        width: CELL,
                                        height: CELL,
                                        cursor: clickable ? 'pointer' : 'default',
                                        background: isWinCell
                                            ? 'rgba(255,255,255,0.22)'
                                            : 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.16)',
                                        boxShadow: isWinCell
                                            ? '0 0 24px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.25)'
                                            : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 24px rgba(0,0,0,0.28)',
                                        backdropFilter: 'blur(4px)',
                                    }}
                                >
                                    {!isEmpty && (
                                        <div style={{ animation: 'ttPop 0.22s ease-out both' }}>
                                            <Mark value={value} size={CELL * 0.66} />
                                        </div>
                                    )}
                                    {clickable && (
                                        <span
                                            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                            style={{ background: 'rgba(255,255,255,0.10)' }}
                                        />
                                    )}
                                </button>
                            );
                        }),
                    )}
                </div>
            </div>
        </>
    );
}
