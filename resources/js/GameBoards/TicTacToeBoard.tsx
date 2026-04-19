const SYMBOLS = [' ', '❌', '⭕'];

export type TicTacToeBoardProps = {
    board: number[][];
    isYourTurn: boolean;
    disabled: boolean;
    onMove: (row: number, col: number) => void;
};

export default function TicTacToeBoard({ board, isYourTurn, disabled, onMove }: TicTacToeBoardProps) {
    const interactive = isYourTurn && !disabled;

    const handleCellClick = (row: number, col: number) => {
        if (!interactive) return;
        if (board[row][col] !== 0) return;
        onMove(row, col);
    };

    return (
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            {board.map((row, rowIndex) =>
                row.map((square, colIndex) => {
                    const isEmpty = square === 0;
                    const clickable = interactive && isEmpty;
                    return (
                        <button
                            key={`${rowIndex}-${colIndex}`}
                            type="button"
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            disabled={!clickable}
                            className="aspect-square rounded-3xl border border-slate-300 bg-slate-50 text-5xl font-black text-slate-900 transition enabled:hover:border-slate-400 enabled:hover:bg-slate-100 disabled:opacity-80"
                            style={{ cursor: clickable ? 'pointer' : 'default' }}
                        >
                            {SYMBOLS[square]}
                        </button>
                    );
                }),
            )}
        </div>
    );
}
