import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { useEffect } from 'react';

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
    const canStartAi = isHost && session.players.length === 1;
    const canCloseRoom = isHost && session.players.length === 1;

    useEffect(() => {
        const lobbyChannel = `lobby.${game.slug}`;
        const gameChannel = `game.${session.id}`;

        window.Echo.join(lobbyChannel)
            .here(() => {})
            .joining(() => {})
            .leaving(() => {})
            .listen('.player.joined.lobby', () => {
                router.reload({ only: ['session'] });
            })
            .listen('.player.left.lobby', () => {
                router.reload({ only: ['session'] });
            })
            .error((err: unknown) => console.error('[lobby] channel error', err));

        window.Echo.join(gameChannel)
            .listen('.game.started', () => {
                router.visit(route('game.show', session.id));
            })
            .error((err: unknown) => console.error('[game] channel error', err));

        return () => {
            window.Echo.leave(lobbyChannel);
            window.Echo.leave(gameChannel);
        };
    }, [game.slug, session.id]);

    const handleStart = () => {
        router.post(route('game.start', session.id));
    };

    const handleStartAi = () => {
        router.post(route('game.start-vs-ai', session.id));
    };

    const handleCloseRoom = () => {
        router.post(route('game.close-room', session.id));
    };

    return (
        <AuthenticatedLayout
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
                                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <PrimaryButton onClick={handleStart} disabled={!canStartGame}>
                                        Pokreni igru
                                    </PrimaryButton>
                                    <PrimaryButton onClick={handleStartAi} disabled={!canStartAi}>
                                        Igraj protiv AI
                                    </PrimaryButton>
                                    {canCloseRoom && (
                                        <SecondaryButton onClick={handleCloseRoom}>
                                            Zatvori sobu
                                        </SecondaryButton>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
