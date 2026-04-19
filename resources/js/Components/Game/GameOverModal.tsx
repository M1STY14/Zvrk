import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

type Props = {
    show: boolean;
    winnerName: string | null;
    draw: boolean;
    onClose: () => void;
    onLeave: () => void;
};

export default function GameOverModal({ show, winnerName, draw, onClose, onLeave }: Props) {
    const title = draw ? 'Izjednačeno!' : winnerName ? `${winnerName} je pobjednik!` : 'Kraj igre';
    const emoji = draw ? '🤝' : '🎉';

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-6 text-center">
                <div className="text-5xl">{emoji}</div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                    {draw ? 'Nitko nije pobijedio.' : 'Čestitamo!'}
                </p>

                <div className="mt-6 flex justify-center gap-3">
                    <SecondaryButton onClick={onClose}>Zatvori</SecondaryButton>
                    <PrimaryButton onClick={onLeave}>Napusti igru</PrimaryButton>
                </div>
            </div>
        </Modal>
    );
}
