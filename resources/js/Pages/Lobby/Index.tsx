import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoomCard from '../Components/RoomCard';
import CreateRoomModal from '../Components/CreateRoomModal';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

// The Room interface defines the structure of a room object, 
//which includes the room's id, name, host's name, current number of players, 
// and maximum number of players allowed in the room.
interface Room{
    id: number;
    name: string;
    host_name: string;
    current_players: number;
    max_players: number;
}

// The Game interface defines the structure of a game object, 
// which includes the game's name, slug, and the minimum and maximum number 
// of players allowed
interface Game {
    name: string;
    slug: string;
    min_players: number;
    max_players: number;
}

//------------------------------------------------------
//TO BACK. DEVS.:
//mockGame data - CHANGE WITH REAL FUNCTIONAL PROP WHEN BACKEND IS DONE
const mockGame: Game = {
    name: 'Tic-Tac-Toe',
    slug: 'tic-tac-toe',
    min_players: 1,
    max_players: 2
};

//Also CHANGE mockRooms with real data from backend when it's done
const mockRooms: Room[] = [
    { id: 1, name: 'Soba 1', host_name: 'Test Nicole', current_players: 1, max_players: 2 },
    { id: 2, name: 'Soba 2', host_name: 'Test Nicole', current_players: 2, max_players: 2 },
    { id: 3, name: 'Soba 3', host_name: 'Test Nicole', current_players: 0, max_players: 4 },
];
//------------------------------------------------------

export default function Index() {
    const [rooms, setRooms] = useState<Room[]>(mockRooms); // Holds the list of rooms, initialized with mock data
    const [showModal, setShowModal] = useState(false); //Controls the visibility of the CreateRoomModal

    const handleJoin = (roomId: number) => {
        //TO BACK. DEVS.: Implement the logic to join a room using the roomId
        console.log(`Joining room with ID: ${roomId}`);
    };

    const handleCreate = (data: { name: string; max_players: number }) => {
        //TO BACK. DEVS.: Implement the logic to create a new room using the provided data
        console.log('Creating room with data:', data);
        
        // TO BACK. DEVS.:
        const newRoom: Room = {
            id: rooms.length + 1,// Mock ID, replace it with real ID from backend
            name: data.name,
            host_name: 'Ja', // Replace with actual current user's name
            current_players: 1, // The host is the first player in the room
            max_players: data.max_players,
        };
        setRooms([...rooms, newRoom]);
        setShowModal(false); // Closeing the modal after creating the room
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        {mockGame.name} — Lobby
                    </h2>
                    <PrimaryButton onClick={() => setShowModal(true)}>
                        Kreiraj sobu
                    </PrimaryButton>
                </div>
            }
        >
            <Head title={`${mockGame.name} — Lobby`} />
            
            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
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
                minPlayers={mockGame.min_players}
                maxPlayers={mockGame.max_players}
            />
        </AuthenticatedLayout>
    );
}