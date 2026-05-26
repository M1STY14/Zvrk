import GameLayout from '@/Components/Layout/GameLayout';
import SessionPlayersList from '@/Components/Game/SessionPlayersList';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useLobbyGameChannel } from '@/hooks/useLobbyGameChannel';
import type { GameSessionPlayer } from '@/types/gameSession';
import { Head, router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface Session {
    id: string;
    name: string;
    host_user_id: string;
    max_players: number;
    players: GameSessionPlayer[];
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

    const { isPlayerDisconnected, showDisconnectedBanner } = useLobbyGameChannel({
        gameSlug: game.slug,
        sessionId: session.id,
        players: session.players,
        currentUserId: auth.user.id,
    });

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

                            <SessionPlayersList
                                players={session.players}
                                hostUserId={session.host_user_id}
                                isPlayerDisconnected={isPlayerDisconnected}
                                showDisconnectedBanner={showDisconnectedBanner}
                            />

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
                                    {game.slug === 'tic-tac-toe' && (
                                        <PrimaryButton onClick={handleStartAi} disabled={!canStartAi}>
                                            Igraj protiv AI
                                        </PrimaryButton>
                                    )}
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
        </GameLayout>
    );
}
