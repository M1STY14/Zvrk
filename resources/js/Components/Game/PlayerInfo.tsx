import PlayerConnectionBadge from '@/Components/Game/PlayerConnectionBadge';

type Player = {
    id: string;
    name: string;
    player_number: number;
    mark: string;
    isConnected?: boolean;
};

type Props = {
    players: Player[];
    currentPlayerId: string | null;
};

export default function PlayerInfo({ players, currentPlayerId }: Props) {
    return (
        <div className="rounded-3xl bg-slate-950/5 p-5">
            <h2 className="text-sm uppercase tracking-[0.24em] text-slate-500">Igrači</h2>
            <div className="mt-4 space-y-2 text-slate-700">
                {players.map((player) => {
                    const isActive = player.id === currentPlayerId;
                    const isDisconnected = player.isConnected === false;
                    return (
                        <p
                            key={player.id}
                            className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2 font-semibold transition ${
                                isActive ? 'bg-white text-slate-900 shadow-sm' : ''
                            } ${isDisconnected ? 'opacity-60' : ''}`}
                        >
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate">
                                    {player.mark} {player.name}
                                </span>
                                {isDisconnected && <PlayerConnectionBadge />}
                            </span>
                            <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-slate-500">
                                Igrač {player.player_number}
                            </span>
                        </p>
                    );
                })}
            </div>
        </div>
    );
}
