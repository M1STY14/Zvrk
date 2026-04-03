import PrimaryButton from '@/Components/PrimaryButton';

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
