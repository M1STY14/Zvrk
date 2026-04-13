import PrimaryButton from '@/Components/PrimaryButton';

interface RoomCardProps {
    room: {
        id: string;
        name: string;
        host: { id: string; name: string };
        players_count: number;
        max_players: number;
    };
    onJoin: (roomId: string) => void;
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
    const isFull = room.players_count >= room.max_players;

    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div>
                <h3 className="text-base font-semibold text-gray-900">
                    {room.name}
                </h3>
                <p className="text-sm text-gray-500">Host: {room.host.name}</p>
                <p className="text-sm text-gray-500">
                    Igrači: {room.players_count}/{room.max_players}
                </p>
            </div>

            <PrimaryButton onClick={() => onJoin(room.id)} disabled={isFull}>
                {isFull ? 'Puno' : 'Pridruži se'}
            </PrimaryButton>
        </div>
    );
}
