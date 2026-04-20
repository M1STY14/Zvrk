import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';

type Props = {
    show: boolean;
    winnerName: string | null;
    draw: boolean;
    onLeave: () => void;
};

export default function GameOverModal({ show, winnerName, draw, onLeave }: Props) {
    const title = draw ? 'Izjednačeno!' : winnerName ? `${winnerName} je pobjednik!` : 'Kraj igre';
    const emoji = draw ? '🤝' : '🎉';

    return (
        <Modal show={show} maxWidth="sm">
            <div className="p-6 text-center">
                <div className="text-5xl">{emoji}</div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                    {draw ? 'Nitko nije pobijedio.' : ''}
                </p>

                <div className="mt-6 flex justify-center">
                    <PrimaryButton onClick={onLeave}>Natrag u predvorje</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
