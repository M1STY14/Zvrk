export type ConnectFourState = {
    board: number[][];
    currentTurn: number;
    players: Record<string, string>;
};

export type ConnectFourBoardProps = {
    board: number[][];
    isYourTurn: boolean;
    disabled: boolean;
    onMove: (col: number) => void;
};

const TOKENS: Record<number, string> = {
    0: '',
    1: '●',
    2: '●',
};

const TOKEN_CLASSES: Record<number, string> = {
    0: 'text-transparent',
    1: 'text-red-500',
    2: 'text-amber-400',
};

export default function ConnectFourBoard({ board, isYourTurn, disabled, onMove }: ConnectFourBoardProps) {
    const interactive = isYourTurn && !disabled;
    const columns = board[0]?.length ?? 0;

    const isColumnFull = (col: number) => board[0]?.[col] !== 0;

    return (
        <div className="mx-auto w-full max-w-3xl">
            <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, col) => {
                    const full = isColumnFull(col);
                    const clickable = interactive && !full;

                    return (
                        <button
                            key={`drop-${col}`}
                            type="button"
                            onClick={() => clickable && onMove(col)}
                            disabled={!clickable}
                            className="rounded-xl border border-slate-300 bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-200 disabled:opacity-60"
                        >
                            {full ? 'Pun stupac' : 'Ubaci'}
                        </button>
                    );
                })}
            </div>

            <div className="rounded-3xl border border-slate-300 bg-blue-600 p-3">
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                    {board.map((row, rowIndex) =>
                        row.map((token, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className="flex aspect-square items-center justify-center rounded-full bg-white text-3xl sm:text-4xl"
                            >
                                <span className={TOKEN_CLASSES[token] ?? TOKEN_CLASSES[0]}>{TOKENS[token] ?? ''}</span>
                            </div>
                        )),
                    )}
                </div>
            </div>
        </div>
    );
}

