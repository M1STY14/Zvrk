import PlayerConnectionBadge from '@/Components/Game/PlayerConnectionBadge';
import type { GameSessionPlayer } from '@/types/gameSession';

type Props = {
    players: GameSessionPlayer[];
    hostUserId: string;
    isPlayerDisconnected: (userId: string) => boolean;
    showDisconnectedBanner?: boolean;
};

export default function SessionPlayersList({
    players,
    hostUserId,
    isPlayerDisconnected,
    showDisconnectedBanner = false,
}: Props) {
    return (
        <>
            {showDisconnectedBanner && (
                <p
                    className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
                    role="status"
                >
                    Jedan ili više igrača je privremeno odspojeno. Čekamo ponovno spajanje…
                </p>
            )}

            <ul className="mt-4 space-y-2">
                {players.map((player) => {
                    const disconnected = isPlayerDisconnected(player.user.id);

                    return (
                        <li
                            key={player.id}
                            className={`flex items-center justify-between rounded-md border border-gray-100 px-4 py-3 ${
                                disconnected ? 'opacity-60' : ''
                            }`}
                        >
                            <span className="flex min-w-0 items-center gap-2 text-gray-800">
                                <span className="truncate">{player.user.name}</span>
                                {player.user.id === hostUserId && (
                                    <span className="text-xs text-gray-400">(host)</span>
                                )}
                                {disconnected && <PlayerConnectionBadge />}
                            </span>
                            <span className="shrink-0 text-sm text-gray-400">Igrač {player.player_number}</span>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
