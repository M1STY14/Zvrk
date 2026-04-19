type Props = {
    currentPlayerId: string | null;
    currentUserId: string;
    playerNames: Record<string, string>;
    currentMark: string;
};

export default function TurnIndicator({ currentPlayerId, currentUserId, playerNames, currentMark }: Props) {
    if (!currentPlayerId) {
        return null;
    }

    const isYourTurn = currentPlayerId === currentUserId;
    const name = playerNames[currentPlayerId] ?? 'Igrač';

    return (
        <div className="rounded-3xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            {isYourTurn ? (
                <>Tvoj potez {currentMark}</>
            ) : (
                <>Potez: {name} {currentMark}</>
            )}
        </div>
    );
}
