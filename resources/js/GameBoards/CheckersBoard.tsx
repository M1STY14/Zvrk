import { useEffect, useRef, useState } from 'react';

export type CheckersState = {
    board: number[][];
    currentTurn: number;
    players: Record<number, string>;
};

export type CheckersBoardProps = {
    board: number[][];
    isYourTurn: boolean;
    disabled: boolean;
    playerNumber: number | null;
    onMove: (from: { row: number; col: number }, path: { row: number; col: number }[]) => void;
};

type Square = { row: number; col: number };
type Path = Square[];

type SmokeParticle = {
    id: number;
    x: number;
    y: number;
    color: string;
};

const CELL = 72; // px
const BOARD_SIZE = 8;

const COLORS = {
    light: '#f0d9b5',
    dark: '#b58863',
    selected: '#f6f669',
    validMove: '#cdd16e',
    capture: '#e8654a',
    p1: { bg: '#ff1d25', border: '#b71c1c' },
    p2: { bg: '#3fa9f5', border: '#1976d2' },
    p1King: { bg: '#ff1d25', border: '#b71c1c', crown: '#ffd700' },
    p2King: { bg: '#3fa9f5', border: '#1976d2', crown: '#ffd700' },
};

function isKing(piece: number): boolean {
    return piece === 3 || piece === 4;
}

function isOwned(piece: number, player: number): boolean {
    return player === 1 ? piece === 1 || piece === 3 : piece === 2 || piece === 4;
}

function isOpponent(piece: number, player: number): boolean {
    return player === 1 ? piece === 2 || piece === 4 : piece === 1 || piece === 3;
}

function inBounds(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function forwardDirs(piece: number, player: number): number[] {
    if (isKing(piece)) return [-1, 1];
    return player === 1 ? [-1] : [1];
}

function hasImmediateCapture(board: number[][], row: number, col: number, piece: number, player: number): boolean {
    for (const rd of forwardDirs(piece, player)) {
        for (const cd of [-1, 1]) {
            const midRow = row + rd, midCol = col + cd;
            const landRow = row + 2 * rd, landCol = col + 2 * cd;
            if (!inBounds(landRow, landCol)) continue;
            if (!isOpponent(board[midRow][midCol], player)) continue;
            if (board[landRow][landCol] !== 0) continue;
            return true;
        }
    }
    return false;
}

function hasAnyCapture(board: number[][], player: number): boolean {
    for (let r = 0; r < BOARD_SIZE; r++)
        for (let c = 0; c < BOARD_SIZE; c++)
            if (isOwned(board[r][c], player) && hasImmediateCapture(board, r, c, board[r][c], player))
                return true;
    return false;
}

function generateCaptureSequences(
    board: number[][],
    row: number,
    col: number,
    piece: number,
    player: number,
): Path[] {
    const lastRow = player === 1 ? 0 : 7;
    const sequences: Path[] = [];

    for (const rd of forwardDirs(piece, player)) {
        for (const cd of [-1, 1]) {
            const midRow = row + rd, midCol = col + cd;
            const landRow = row + 2 * rd, landCol = col + 2 * cd;
            if (!inBounds(landRow, landCol)) continue;
            if (!isOpponent(board[midRow][midCol], player)) continue;
            if (board[landRow][landCol] !== 0) continue;

            const newBoard = board.map(r => [...r]);
            newBoard[row][col] = 0;
            newBoard[midRow][midCol] = 0;

            let newPiece = piece;
            const promoted = !isKing(piece) && landRow === lastRow;
            if (promoted) newPiece = player === 1 ? 3 : 4;
            newBoard[landRow][landCol] = newPiece;

            const step = { row: landRow, col: landCol };
            if (promoted) {
                sequences.push([step]);
                continue;
            }

            const continuations = generateCaptureSequences(newBoard, landRow, landCol, newPiece, player);
            if (continuations.length === 0) {
                sequences.push([step]);
            } else {
                for (const cont of continuations) sequences.push([step, ...cont]);
            }
        }
    }
    return sequences;
}

// Returns all valid destination squares (final square of each valid path) for a piece
function validDestinations(board: number[][], fromRow: number, fromCol: number, player: number): { dest: Square; path: Path }[] {
    const piece = board[fromRow][fromCol];
    if (!isOwned(piece, player)) return [];

    const mustCapture = hasAnyCapture(board, player);

    if (mustCapture) {
        const seqs = generateCaptureSequences(board, fromRow, fromCol, piece, player);
        return seqs.map(path => ({ dest: path[path.length - 1], path }));
    }

    // Simple moves
    const results: { dest: Square; path: Path }[] = [];
    for (const rd of forwardDirs(piece, player)) {
        for (const cd of [-1, 1]) {
            const nr = fromRow + rd, nc = fromCol + cd;
            if (inBounds(nr, nc) && board[nr][nc] === 0) {
                results.push({ dest: { row: nr, col: nc }, path: [{ row: nr, col: nc }] });
            }
        }
    }
    return results;
}

function Piece({ piece, size = 56 }: { piece: number; size?: number }) {
    const king = isKing(piece);
    const isP1 = piece === 1 || piece === 3;
    const src = isP1
        ? '/images/checkers_game_props/checkers_buds_red.svg'
        : '/images/checkers_game_props/checkers_buds_blue.svg';

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <img src={src} width={size} height={size} style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
            {king && (
                <div style={{
                    position: 'absolute',
                    top: '18%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: size * 0.32,
                    color: '#ffd700',
                    fontWeight: 'bold',
                    lineHeight: 1,
                    userSelect: 'none',
                    textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                }}>
                    ♛
                </div>
            )}
        </div>
    );
}

let smokeIdCounter = 0;

export default function CheckersBoard({ board, isYourTurn, disabled, playerNumber, onMove }: CheckersBoardProps) {
    const [selected, setSelected] = useState<Square | null>(null);
    const [destinations, setDestinations] = useState<{ dest: Square; path: Path }[]>([]);
    const [smokeParticles, setSmokeParticles] = useState<SmokeParticle[]>([]);
    const prevBoardRef = useRef<number[][] | null>(null);

    const player = playerNumber ?? 1;

    // Flip board so current player's pieces are always at the bottom
    const flip = player === 2;

    function toDisplay(row: number, col: number): { dRow: number; dCol: number } {
        return flip
            ? { dRow: BOARD_SIZE - 1 - row, dCol: BOARD_SIZE - 1 - col }
            : { dRow: row, dCol: col };
    }

    function fromDisplay(dRow: number, dCol: number): Square {
        return flip
            ? { row: BOARD_SIZE - 1 - dRow, col: BOARD_SIZE - 1 - dCol }
            : { row: dRow, col: dCol };
    }

    // Detect captured pieces and spawn smoke particles
    useEffect(() => {
        const prev = prevBoardRef.current;
        if (prev) {
            // Find squares where a piece vanished but reappeared elsewhere (moved, not captured)
            const movedFromSquares = new Set<string>();
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const nowPiece = board[r]?.[c] ?? 0;
                    if ((prev[r]?.[c] ?? 0) === 0 && nowPiece !== 0) {
                        for (let pr = 0; pr < BOARD_SIZE; pr++) {
                            for (let pc = 0; pc < BOARD_SIZE; pc++) {
                                if ((prev[pr]?.[pc] ?? 0) === nowPiece && (board[pr]?.[pc] ?? 0) === 0) {
                                    movedFromSquares.add(`${pr},${pc}`);
                                }
                            }
                        }
                    }
                }
            }

            const newParticles: SmokeParticle[] = [];
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                    const prevPiece = prev[r]?.[c] ?? 0;
                    const nowEmpty = board[r]?.[c] === 0;
                    // Truly captured = piece vanished and did not reappear anywhere
                    const wasCaptured = prevPiece !== 0 && nowEmpty && !movedFromSquares.has(`${r},${c}`);
                    if (wasCaptured) {
                        const color = prevPiece === 1 || prevPiece === 3 ? COLORS.p1.bg : COLORS.p2.bg;
                        const { dRow, dCol } = toDisplay(r, c);
                        newParticles.push({
                            id: smokeIdCounter++,
                            x: dCol * CELL + CELL / 2,
                            y: dRow * CELL + CELL / 2,
                            color,
                        });
                    }
                }
            }
            if (newParticles.length > 0) {
                setSmokeParticles(prev => [...prev, ...newParticles]);
                const ids = newParticles.map(p => p.id);
                setTimeout(() => {
                    setSmokeParticles(prev => prev.filter(p => !ids.includes(p.id)));
                }, 1400);
            }
        }
        prevBoardRef.current = board.map(r => [...r]);
    }, [board]);

    function handleSquareClick(dRow: number, dCol: number) {
        if (!isYourTurn || disabled) return;
        const { row, col } = fromDisplay(dRow, dCol);
        const piece = board[row][col];

        // Clicking a destination square
        if (selected) {
            const match = destinations.find(d => d.dest.row === row && d.dest.col === col);
            if (match) {
                onMove({ row: selected.row, col: selected.col }, match.path);
                setSelected(null);
                setDestinations([]);
                return;
            }
        }

        // Clicking own piece
        if (isOwned(piece, player)) {
            const dests = validDestinations(board, row, col, player);
            if (dests.length > 0) {
                setSelected({ row, col });
                setDestinations(dests);
            } else {
                setSelected(null);
                setDestinations([]);
            }
            return;
        }

        // Clicking elsewhere — deselect
        setSelected(null);
        setDestinations([]);
    }

    const destSet = new Set(destinations.map(d => `${d.dest.row},${d.dest.col}`));
    const boardPx = BOARD_SIZE * CELL;

    return (
        <>
            <style>{`
                @keyframes puffCloud {
                    0%   { opacity: 0;   transform: scale(0.2) translateY(8px); }
                    15%  { opacity: 0.9; transform: scale(0.85) translateY(-6px); }
                    50%  { opacity: 0.7; transform: scale(1.2) translateY(-38px); }
                    100% { opacity: 0;   transform: scale(1.7) translateY(-82px); }
                }
            `}</style>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: boardPx, height: boardPx, borderRadius: 4, overflow: 'visible', boxShadow: '0 24px 48px rgba(0,0,0,0.35)', transform: 'perspective(1200px) rotateX(12deg)' }}>
                    {/* Background squares — clipped so colors don't bleed outside rounded corners */}
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 4, overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
                        {Array.from({ length: BOARD_SIZE }, (_, dRow) =>
                            Array.from({ length: BOARD_SIZE }, (_, dCol) => {
                                const isDark = (dRow + dCol) % 2 === 1;
                                const { row, col } = fromDisplay(dRow, dCol);
                                const piece = board[row]?.[col] ?? 0;
                                const isSelected = selected?.row === row && selected?.col === col;
                                const isDest = destSet.has(`${row},${col}`);
                                const isEmpty = piece === 0;

                                let bg = isDark ? COLORS.dark : COLORS.light;
                                if (isSelected) bg = COLORS.selected;
                                else if (isDest && isDark) bg = COLORS.validMove;

                                return (
                                    <div
                                        key={`bg-${dRow}-${dCol}`}
                                        style={{
                                            position: 'absolute',
                                            left: dCol * CELL,
                                            top: dRow * CELL,
                                            width: CELL,
                                            height: CELL,
                                            background: bg,
                                            transition: 'background 0.15s',
                                        }}
                                    >
                                        {isDest && isEmpty && (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.25)' }} />
                                            </div>
                                        )}
                                        {isDest && !isEmpty && (
                                            <div style={{ position: 'absolute', inset: 3, borderRadius: 4, border: `3px solid ${COLORS.capture}` }} />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Click + pieces layer — not clipped so pieces overflow above the border frame */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
                        {Array.from({ length: BOARD_SIZE }, (_, dRow) =>
                            Array.from({ length: BOARD_SIZE }, (_, dCol) => {
                                const isDark = (dRow + dCol) % 2 === 1;
                                const { row, col } = fromDisplay(dRow, dCol);
                                const piece = board[row]?.[col] ?? 0;
                                const isSelected = selected?.row === row && selected?.col === col;
                                const isDest = destSet.has(`${row},${col}`);

                                return (
                                    <div
                                        key={`int-${dRow}-${dCol}`}
                                        onClick={() => isDark && handleSquareClick(dRow, dCol)}
                                        style={{
                                            position: 'absolute',
                                            left: dCol * CELL,
                                            top: dRow * CELL,
                                            width: CELL,
                                            height: CELL,
                                            cursor: isDark && isYourTurn && !disabled && (isDest || isOwned(piece, player)) ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {piece !== 0 && (
                                            <div style={{
                                                transition: 'transform 0.15s',
                                                transform: isSelected ? 'scale(1.1) translateY(-4px)' : 'scale(1) translateY(0)',
                                                filter: isSelected
                                                    ? 'drop-shadow(0 0 6px rgba(255,255,100,0.8)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
                                                    : 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))',
                                                marginTop: -6,
                                            }}>
                                                <Piece piece={piece} size={CELL - 12} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Board corner — same as Ludo */}
                    <img
                        src="/images/ludo_game_props/ludo_board_corner.svg"
                        alt=""
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: boardPx + 12,
                            height: boardPx + 4,
                            pointerEvents: 'none',
                            zIndex: 5,
                            display: 'block',
                        }}
                    />

                    {/* Smoke particles — rendered outside clipped board layer */}
                    {smokeParticles.map((p) => (
                        <svg
                            key={p.id}
                            style={{
                                position: 'absolute',
                                left: p.x - 36,
                                top: p.y - 36,
                                width: 72,
                                height: 72,
                                pointerEvents: 'none',
                                overflow: 'visible',
                                animation: 'puffCloud 1.4s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                                zIndex: 20,
                            }}
                            viewBox="0 0 72 72"
                        >
                            {/* Main cloud body */}
                            <ellipse cx="36" cy="44" rx="18" ry="12" fill={p.color} opacity="0.75" />
                            {/* Left bump */}
                            <circle cx="22" cy="40" r="11" fill={p.color} opacity="0.7" />
                            {/* Right bump */}
                            <circle cx="50" cy="40" r="10" fill={p.color} opacity="0.7" />
                            {/* Top centre dome */}
                            <circle cx="36" cy="32" r="13" fill={p.color} opacity="0.8" />
                            {/* Small top-left puff */}
                            <circle cx="26" cy="29" r="8" fill={p.color} opacity="0.65" />
                            {/* Small top-right puff */}
                            <circle cx="46" cy="29" r="7" fill={p.color} opacity="0.65" />
                            {/* Highlight sheen */}
                            <ellipse cx="32" cy="27" rx="6" ry="4" fill="white" opacity="0.18" />
                        </svg>
                    ))}
                </div>
            </div>
        </>
    );
}