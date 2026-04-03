import PrimaryButton from '@/Components/PrimaryButton';

// The RoomCardProps interface defines the expected props for the RoomCard component,
// which includes a room object with details about theroom and an onJoin function to handle 
// joining the room.
interface RoomCardProps {
    room: {
        id: number;
        name: string;
        host_name: string;
        current_players: number;
        max_players: number;
    };
    onJoin: (roomId: number) => void;
}

//Main RoomCard function is to display the details of a game room in a card format
export default function RoomCard({ room, onJoin }: RoomCardProps) {
    const isFull = room.current_players >= room.max_players;

    return (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div>
                <h3 className="text-base font-semibold text-gray-900">
                    {room.name}
                </h3>
                <p className="text-sm text-gray-500">Host: {room.host_name}</p>
                <p className="text-sm text-gray-500">
                    Igrači: {room.current_players}/{room.max_players}
                </p>
            </div>

            <PrimaryButton onClick={() => onJoin(room.id)} disabled={isFull}>
                {isFull ? 'Puno' : 'Pridruži se'}
            </PrimaryButton>
        </div>
    );
}
