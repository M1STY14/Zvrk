import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import RoomCard from '@/Components/RoomCard';
import CreateRoomModal from '@/Components/CreateRoomModal';
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
