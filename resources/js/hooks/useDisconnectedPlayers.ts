import type { GameSessionPlayer } from '@/types/gameSession';
import { useCallback, useMemo, useState } from 'react';

export function useDisconnectedPlayers(players: GameSessionPlayer[]) {
    const initialIds = useMemo(
        () => players.filter((p) => !p.is_connected).map((p) => p.user.id),
        [players],
    );

    const [disconnectedUserIds, setDisconnectedUserIds] = useState<Set<string>>(
        () => new Set(initialIds),
    );

    const onPlayerConnectionChanged = useCallback((userId: string, isConnected: boolean) => {
        setDisconnectedUserIds((prev) => {
            const next = new Set(prev);
            if (isConnected) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    }, []);

    return {
        disconnectedUserIds,
        onPlayerConnectionChanged,
        isDisconnected: (userId: string) => disconnectedUserIds.has(userId),
        hasDisconnectedOpponent: (currentUserId: string) =>
            [...disconnectedUserIds].some((id) => id !== currentUserId),
    };
}
