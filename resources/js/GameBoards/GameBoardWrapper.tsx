import TicTacToeBoard, { TicTacToeBoardProps } from './TicTacToeBoard';

type BoardProps = TicTacToeBoardProps;

type Props = {
    gameSlug: string;
} & BoardProps;

const BOARDS: Record<string, (props: BoardProps) => JSX.Element> = {
    'tic-tac-toe': TicTacToeBoard,
};

export default function GameBoardWrapper({ gameSlug, ...boardProps }: Props) {
    const Board = BOARDS[gameSlug];

    if (!Board) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                Igra "{gameSlug}" još nije podržana.
            </div>
        );
    }

    return <Board {...boardProps} />;
}
