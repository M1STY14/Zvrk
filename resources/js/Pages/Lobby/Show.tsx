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

const mockCurrentUserId = 1;
const mockHostId = 1;
//------------------------------------------------------

export default function Show() {
    //TO BACK. DEVS.: Implement real data.
    const [players] = useState<Player[]>(mockPlayers); 
    const isHost = mockCurrentUserId === mockHostId ? 1 : 0; // Checking if the current user is the host
    const canStartGame = players.length >= mockGame.min_players; // Checking if there are enough players to start the game

    const handleStart = () => {
        //TO BACK. DEVS.: Implement the logic to start the game, such as redirecting to the game page or sending a request to the backend.
        console.log('Pokretanje igre...');
    }

    return (
         <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    {mockGame.name} — {mockRoom.name}
                </h2>
            }
        >
            <Head title={`${mockGame.name} — ${mockRoom.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Igrači u sobi ({players.length}/{mockRoom.max_players})
                            </h3>

                            <ul className="mt-4 space-y-2">
                                {players.map((player) => (
                                    <li key={player.id} className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3" >
                                        <span className="text-gray-800">
                                            {player.name}
                                            {player.id === mockHostId && (
                                                <span className="ml-2 text-xs text-gray-400">
                                                    (host)
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            Igrač {player.player_number}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {!canStartGame && (
                                <p className="mt-4 text-sm text-gray-500">
                                    Čekamo još igrača... (minimum {mockGame.min_players})
                                </p>
                            )}

                            {isHost && (
                                <div className="mt-6">
                                    <PrimaryButton onClick={handleStart} disabled={!canStartGame} >
                                        Pokreni igru 🎮
                                    </PrimaryButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}