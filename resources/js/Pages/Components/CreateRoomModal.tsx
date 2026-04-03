import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import { useState } from 'react';

interface CreateRoomModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; max_players: number }) => void;
    minPlayers: number;
    maxPlayers: number;
}

export default function CreateRoomModal({
    show,
    onClose,
    onSubmit,
    minPlayers,
    maxPlayers,
}: CreateRoomModalProps) {
    const [name, setName] = useState('');
    const [maxPlayersValue, setMaxPlayersValue] = useState(minPlayers);
    const [errors, setErrors] = useState<{ name?: string; max_players?: string }>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string; max_players?: string } = {};
        
        if (!name.trim()) {
            newErrors.name = 'Naziv sobe je obavezan.';
        }

        if (maxPlayersValue < minPlayers || maxPlayersValue > maxPlayers) {
            newErrors.max_players = `Broj igrača mora biti između ${minPlayers} i ${maxPlayers}.`;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit({ name, max_players: maxPlayersValue });
        setName('');
        setMaxPlayersValue(minPlayers);
        setErrors({});
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-6">
                <h2 className="text-lg font-semibold text-gray-900">
                    Kreiraj sobu
                </h2>

                <div className="mt-4">
                    <InputLabel htmlFor="name" value="Naziv sobe" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="npr. Moja pobjednička soba"
                    />
                    <InputError message={errors.name} className="mt-1" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="max_players" value="Maksimalno igrača" />
                    <TextInput
                        id="max_players"
                        type="number"
                        className="mt-1 block w-full"
                        value={maxPlayersValue}
                        min={minPlayers}
                        max={maxPlayers}
                        onChange={(e) => setMaxPlayersValue(Number(e.target.value))}
                    />
                    <InputError message={errors.max_players} className="mt-1" />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton type="button" onClick={onClose}>
                        Odustani 😔
                    </SecondaryButton>
                    <PrimaryButton type="submit">Kreiraj 🎉</PrimaryButton>
                </div>

            </form>
        </Modal>
    );
}