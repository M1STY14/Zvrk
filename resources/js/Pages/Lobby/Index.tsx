import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoomCard from '../Components/RoomCard';
import CreateRoomModal from '../Components/CreateRoomModal';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Room {
    id: string;
    name: string;
    host: { id: string; name: string };
    players_count: number;
    max_players: number;
}

interface Game {
    name: string;
    slug: string;
    min_players: number;
    max_players: number;
}

interface Props {
    game: Game;
    rooms: Room[];
    userRoomId?: string | null;
}

export default function Index({ game, rooms, userRoomId = null }: Props) {
    const [showModal, setShowModal] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);

    const handleJoin = (roomId: string) => {
        if (userRoomId !== null && userRoomId !== roomId) {
            setJoinError('Cannot join a room you\'re already in.');
            return;
        }
        setJoinError(null);

        if (userRoomId === roomId) {
            router.visit(route('lobby.show', [game.slug, roomId]));
            return;
        }

        router.post(route('game.join', roomId));
    };

    const handleCreate = (data: { name: string; max_players: number }) => {
        router.post(route('lobby.store', game.slug), data, {
            onSuccess: () => setShowModal(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {game.name} — Lobby
                    </h2>
                    <PrimaryButton
                        onClick={() => setShowModal(true)}
                        disabled={userRoomId !== null}
                    >
                        Kreiraj sobu
                    </PrimaryButton>
                </div>
            }
        >
            <Head title={`${game.name} — Lobby`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {joinError && (
                        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {joinError}
                        </div>
                    )}
                    {rooms.length === 0 ? (
                        <div className="rounded-lg bg-white p-8 text-center shadow-sm">
                            <p className="text-gray-500">
                                Nema otvorenih soba. Budi prvi i kreiraj sobu!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rooms.map((room) => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    onJoin={handleJoin}
                                    isUserRoom={userRoomId === room.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreateRoomModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleCreate}
                minPlayers={game.min_players}
                maxPlayers={game.max_players}
            />
        </AuthenticatedLayout>
    );
}
