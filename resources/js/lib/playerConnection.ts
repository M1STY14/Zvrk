import type { GameSessionPlayer } from '@/types/gameSession';

export function isPlayerConnected(disconnectedUserIds: Set<string>, userId: string): boolean {
    return !disconnectedUserIds.has(userId);
}

export function shouldShowOpponentDisconnectedBanner(
    gameOver: boolean,
    currentUserId: string,
    disconnectedUserIds: Set<string>,
): boolean {
    if (gameOver) {
        return false;
    }

    return [...disconnectedUserIds].some((id) => id !== currentUserId);
}

export function hasMultipleHumanOpponents(players: GameSessionPlayer[], currentUserId: string): boolean {
    const others = players.filter((p) => p.user.id !== currentUserId);

    return others.length > 1;
}
