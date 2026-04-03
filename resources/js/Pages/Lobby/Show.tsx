import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head } from '@inertiajs/react';
import { useState } from 'react';

interface Player {
    id: number;
    name: string;
    player_number: number;
}

interface Room {
    id: number;
    name: string;
    max_players: number;
}

interface Game {
    name: string;
    min_players: number;
}

//------------------------------------------------------
//TO BACK. DEVS.: Implement real data.
const mockGame: Game = {
    name: 'Tic-Tac-Toe',
    min_players: 1
}

const mockRoom: Room = {
    id: 1,
    name: 'Soba 1',
    max_players: 2
}

const mockPlayers: Player[] = [
    { id: 1, name: 'Nicole 1', player_number: 1 },
    { id: 2, name: 'AI', player_number: 2 }
];
//------------------------------------------------------