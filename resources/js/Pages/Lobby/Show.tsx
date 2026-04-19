import GameLayout from '@/Components/Layout/GameLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Player {
    id: string;
    user: User;
    player_number: number;
}

interface User {
    id: string;
    name: string;
}

interface Session {
    id: string;
    name: string;
    host_user_id: string;
    max_players: number;
    players: Player[];
}

interface Game {
    name: string;
    slug: string;
    min_players: number;
}

interface Props extends PageProps {
    game: Game;
    session: Session;
}

export default function Show({ game, session }: Props) {
    const { auth } = usePage<Props>().props;
    const isHost = auth.user.id === session.host_user_id;
    const canStartGame = session.players.length >= game.min_players;

    const handleStart = () => {
        console.log('Pokretanje igre...');
    };

    return (
        <GameLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    {game.name} — {session.name}
                </h2>
            }
        >
            <Head title={`${game.name} — ${session.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Igrači u sobi ({session.players.length}/{session.max_players})
                            </h3>

                            <ul className="mt-4 space-y-2">
                                {session.players.map((player) => (
                                    <li key={player.id} className="flex items-center justify-between rounded-md border border-gray-100 px-4 py-3">
                                        <span className="text-gray-800">
                                            {player.user.name}
                                            {player.user.id === session.host_user_id && (
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
                                    Čekamo još igrača... (minimum {game.min_players})
                                </p>
                            )}

                            {isHost && (
                                <div className="mt-6">
                                    <PrimaryButton onClick={handleStart} disabled={!canStartGame}>
                                        Pokreni igru
                                    </PrimaryButton>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </GameLayout>
    );
}
