import CheckersBoard, { CheckersBoardProps } from './CheckersBoard';
import ConnectFourBoard, { ConnectFourBoardProps } from './ConnectFourBoard';
import LudoBoard, { LudoBoardProps } from './LudoBoard';
import SnapsBoard, { SnapsBoardProps } from './SnapsBoard';
import TicTacToeBoard, { TicTacToeBoardProps } from './TicTacToeBoard';

type BoardProps = TicTacToeBoardProps | LudoBoardProps | CheckersBoardProps | ConnectFourBoardProps | SnapsBoardProps;

type Props = {
    gameSlug: string;
} & BoardProps;

const BOARDS: Record<string, (props: BoardProps) => JSX.Element> = {
    'tic-tac-toe': TicTacToeBoard as (props: BoardProps) => JSX.Element,
    'ludo': LudoBoard as (props: BoardProps) => JSX.Element,
    'checkers': CheckersBoard as (props: BoardProps) => JSX.Element,
    'four-in-a-row': ConnectFourBoard as (props: BoardProps) => JSX.Element,
    'snaps': SnapsBoard as (props: BoardProps) => JSX.Element,
};

export default function GameBoardWrapper({ gameSlug, ...boardProps }: Props) {
    const Board = BOARDS[gameSlug];

    if (!Board) {
        return (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
                Igra &ldquo;{gameSlug}&rdquo; još nije podržana.
            </div>
        );
    }

    return <Board {...boardProps} />;
}
