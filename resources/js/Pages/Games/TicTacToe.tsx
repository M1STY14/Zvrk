import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type TicTacToeState = {
    board: number[][];
    currentTurn: number;
    players: Record<'1' | '2', string>;
};

type GameResult = {
    winner: string | null;
    draw: boolean;
};

const symbols = [' ', '❌', '⭕'];

function calculateResult(board: number[][]): GameResult {
    const lines = [
        [board[0][0], board[0][1], board[0][2]],
        [board[1][0], board[1][1], board[1][2]],
        [board[2][0], board[2][1], board[2][2]],
        [board[0][0], board[1][0], board[2][0]],
        [board[0][1], board[1][1], board[2][1]],
        [board[0][2], board[1][2], board[2][2]],
        [board[0][0], board[1][1], board[2][2]],
        [board[0][2], board[1][1], board[2][0]],
    ];

    for (const line of lines) {
        const [a, b, c] = line;
        if (a !== 0 && a === b && b === c) {
            return { winner: String(a), draw: false };
        }
    }

    const isDraw = board.every((row) => row.every((cell) => cell !== 0));
    return { winner: null, draw: isDraw };
}

function cloneBoard(board: number[][]): number[][] {
    return board.map((row) => [...row]);
}

export default function TicTacToe({ auth, initialState }: PageProps<{ initialState: TicTacToeState }>) {
    const [board, setBoard] = useState<number[][]>(initialState.board);
    const [currentTurn, setCurrentTurn] = useState<number>(initialState.currentTurn);
    const [winner, setWinner] = useState<string | null>(null);
    const [draw, setDraw] = useState(false);

    const displayPlayerNames = useMemo(() => ({
        '1': initialState.players['1'] === 'Player 1' ? 'Igrač 1' : initialState.players['1'],
        '2': initialState.players['2'] === 'Player 2' ? 'Igrač 2' : initialState.players['2'],
    }), [initialState.players]);

    const currentPlayerName = useMemo(
        () => displayPlayerNames[currentTurn.toString() as '1' | '2'],
        [currentTurn, displayPlayerNames]
    );

    const boardStatus = useMemo(() => {
        if (winner) {
            return `🎉 ${winner} je pobjednik!`;
        }

        if (draw) {
            return '🤝 Izjednačeno!';
        }

        return `Potez: ${currentPlayerName} ${symbols[currentTurn]}`;
    }, [currentPlayerName, currentTurn, winner, draw]);

    const handleCellClick = (rowIndex: number, colIndex: number) => {
        if (winner || draw) {
            return;
        }

        if (board[rowIndex][colIndex] !== 0) {
            return;
        }

        const nextBoard = cloneBoard(board);
        nextBoard[rowIndex][colIndex] = currentTurn;

        const result = calculateResult(nextBoard);

        setBoard(nextBoard);

        if (result.winner) {
            setWinner(displayPlayerNames[result.winner as '1' | '2']);
            return;
        }

        if (result.draw) {
            setDraw(true);
            return;
        }

        setCurrentTurn(currentTurn === 1 ? 2 : 1);
    };

    const resetGame = () => {
        setBoard(initialState.board);
        setCurrentTurn(initialState.currentTurn);
        setWinner(null);
        setDraw(false);
    };

    return (
        <>
            <Head title="Tic Tac Toe" />

            <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight">Tic Tac Toe</h1>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link href={route('welcome')} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100">
                                Natrag na početnu stranicu
                            </Link>
                            <button
                                type="button"
                                onClick={resetGame}
                                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                                Počni novu igru
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Trenutno stanje:</p>
                                <p className="mt-2 text-xl font-semibold text-slate-900">{boardStatus}</p>
                            </div>
                            {auth.user && (
                                <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                                    Igrač: {auth.user.name}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                            {board.map((row, rowIndex) =>
                                row.map((square, colIndex) => (
                                    <button
                                        key={`${rowIndex}-${colIndex}`}
                                        type="button"
                                        onClick={() => handleCellClick(rowIndex, colIndex)}
                                        className="aspect-square rounded-3xl border border-slate-300 bg-slate-50 text-5xl font-black text-slate-900 transition hover:border-slate-400 hover:bg-slate-100"
                                        style={{ cursor: winner || draw ? 'default' : 'pointer' }}
                                    >
                                        {symbols[square]}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="mt-8 rounded-3xl bg-slate-950/5 p-5">
                            <h2 className="text-sm uppercase tracking-[0.24em] text-slate-500">Igrači</h2>
                            <div className="mt-4 space-y-2 text-slate-700">
                                <p className="font-semibold">❌ {displayPlayerNames['1']}</p>
                                <p className="font-semibold">⭕ {displayPlayerNames['2']}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
