import type { MouseEvent } from 'react';

export type SnapsTrickItem = {
    player: number;
    card: string;
};

export type SnapsState = {
    currentTurn: number;
    players: Record<string, string>;
    hands: Record<string, string[]>;
    stock: string[];
    trumpCard: string;
    trick: SnapsTrickItem[];
    capturedPoints: Record<string, number>;
    scores: Record<string, number>;
    lastTrickWinner: number | null;
    drawQueue: number[];
    closed?: boolean;
    closedBy?: number | null;
    totalPointsAtClose?: Record<string, number>;
};

export type SnapsBoardProps = {
    state: SnapsState;
    currentPlayerNumber: number | null;
    isYourTurn: boolean;
    isFinished: boolean;
    playerNames: Record<string, string>;
    onPlayCard: (card: string) => void;
    onDrawCard: () => void;
    onClose?: () => void;
    onSwapTrump?: () => void;
    onDeclareMarriage?: (card: string) => void;
};

const SUIT_SYMBOLS: Record<string, string> = {
    H: '♥',
    D: '♦',
    C: '♣',
    S: '♠',
};

function formatCard(card: string): string {
    const [suit, rank] = card.split('-');
    return `${rank}${SUIT_SYMBOLS[suit] ?? suit}`;
}

function renderCardLabel(card: string): JSX.Element {
    const [suit, rank] = card.split('-');
    const isRed = suit === 'H' || suit === 'D';
    return (
        <span className={`inline-flex items-center justify-center rounded-2xl border-2 px-4 py-3 text-lg font-black ${
            isRed ? 'border-red-300 bg-white text-red-600' : 'border-slate-700 bg-white text-slate-900'
        }`}>
            {formatCard(card)}
        </span>
    );
}

export default function SnapsBoard({ state, currentPlayerNumber, isYourTurn, isFinished, playerNames, onPlayCard, onDrawCard, onClose, onSwapTrump, onDeclareMarriage }: SnapsBoardProps) {
    const opponentNumber = currentPlayerNumber === 1 ? 2 : 1;
    const ownHand = currentPlayerNumber ? state.hands[String(currentPlayerNumber)] ?? [] : [];
    const opponentHandCount = state.hands[String(opponentNumber)]?.length ?? 0;
    const isClosed = state.closed ?? false;
    const player1Name = playerNames[state.players['1']] ?? 'Igrač 1';
    const player2Name = playerNames[state.players['2']] ?? 'Igrač 2';
    const currentPlayerName = playerNames[state.players[String(state.currentTurn)]] ?? `Igrač ${state.currentTurn}`;
    const opponentName = playerNames[state.players[String(opponentNumber)]] ?? `Igrač ${opponentNumber}`;
    const closedByLabel = state.closedBy ? playerNames[state.players[String(state.closedBy)]] ?? `Igrač ${state.closedBy}` : null;

    const playerCanDraw =
        currentPlayerNumber !== null &&
        state.drawQueue.length > 0 &&
        state.drawQueue[0] === currentPlayerNumber &&
        isYourTurn &&
        state.stock.length > 0 &&
        !isFinished &&
        !isClosed;

    const winnerNumber = Object.keys(state.scores).find((k) => (state.scores as any)[k] >= 501) ?? null;

    const handlePlay = (card: string) => (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!isYourTurn) return;
        onPlayCard(card);
    };

    const handleClose = () => {
        if (!isYourTurn || !onClose || isClosed) return;
        onClose();
    };

    const trumpSuit = state.trumpCard.split('-')[0] ?? '';
    const trumpJack = `${trumpSuit}-J`;
    const canClose = isYourTurn && state.stock.length > 0 && !isFinished && !isClosed;
    const canSwapTrump = isYourTurn && ownHand.includes(trumpJack) && state.stock.length > 0 && !isFinished && !isClosed;

    const handleSwap = () => {
        if (!isYourTurn || !onSwapTrump || isClosed) return;
        onSwapTrump();
    };

    const handleDeclare = (card: string) => () => {
        if (!isYourTurn || !onDeclareMarriage) return;
        onDeclareMarriage(card);
    };

    return (
        <div className="flex min-h-screen flex-col gap-4 bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 pb-32 pt-4">
            {/* GORNJI DIO - Protivnik */}
            <div className="grid gap-4 px-4 xl:grid-cols-[minmax(260px,300px)_1fr_minmax(260px,300px)]">
                {/* Lijevo - Protivnik */}
                <div className="rounded-3xl border-2 border-white/20 bg-slate-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
                    <div className="text-sm font-bold uppercase tracking-widest text-amber-300">{opponentName}</div>
                    <div className="mt-4 rounded-2xl bg-slate-800/50 px-4 py-3 text-center">
                        <div className="text-xs text-slate-300">Karata u ruci</div>
                        <div className="text-2xl font-bold text-white">{opponentHandCount}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                        {Array(Math.min(opponentHandCount, 6)).fill(0).map((_, i) => (
                            <div key={i} className="h-20 w-12 rounded-lg border-2 border-blue-400 bg-gradient-to-br from-blue-900 to-blue-700 shadow-md">
                                <div className="flex h-full items-center justify-center text-xs font-bold text-blue-200">🔷</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sredina - Adut i Špil */}
                <div className="rounded-3xl border-2 border-white/20 bg-slate-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-800/50 p-4 text-center">
                            <div className="text-xs uppercase tracking-widest text-amber-300">Adut</div>
                            <div className="mt-3">{renderCardLabel(state.trumpCard)}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-800/50 p-4 text-center">
                            <div className="text-xs uppercase tracking-widest text-amber-300">Špil</div>
                            <div className="mt-3 text-3xl font-bold text-amber-300">{state.stock.length}</div>
                        </div>
                    </div>
                    {isClosed && (
                        <div className="mt-3 rounded-2xl border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-center text-sm text-amber-200">
                            ✓ Talon zatvoren {closedByLabel ? `(${closedByLabel})` : ''}
                        </div>
                    )}
                </div>

                {/* Desno - Rezultati */}
                <div className="rounded-3xl border-2 border-white/20 bg-slate-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
                    <div className="text-sm font-bold uppercase tracking-widest text-amber-300">Rezultati</div>
                    <div className="mt-4 space-y-2">
                        <div className="rounded-2xl bg-slate-800/50 px-4 py-3">
                            <div className="text-xs text-slate-300">{player1Name}</div>
                            <div className="mt-1 text-2xl font-bold text-white">{state.scores['1']}</div>
                        </div>
                        <div className="rounded-2xl bg-slate-800/50 px-4 py-3">
                            <div className="text-xs text-slate-300">{player2Name}</div>
                            <div className="mt-1 text-2xl font-bold text-white">{state.scores['2']}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SREDINA - Tablica sa odirane karte */}
            <div className="mx-4 flex-1 rounded-3xl border-4 border-emerald-500/50 bg-gradient-to-b from-emerald-900/30 to-emerald-900/20 p-6 shadow-2xl backdrop-blur-sm">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-300">Trenutna Slag</div>
                <div className="mt-6 flex min-h-[200px] items-center justify-center">
                    {state.trick.length === 0 ? (
                        <div className="text-center">
                            <div className="text-2xl text-emerald-300/60">Stol je prazan</div>
                            <div className="mt-2 text-sm text-emerald-300/40">Čeka se prvi potez...</div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap justify-center gap-6">
                            {state.trick.map((item, idx) => {
                                const [suit] = item.card.split('-');
                                const isRed = suit === 'H' || suit === 'D';
                                const trickPlayerName = playerNames[state.players[String(item.player)]] ?? `Igrač ${item.player}`;
                                return (
                                    <div
                                        key={`${item.player}-${item.card}`}
                                        className="transform transition-all hover:scale-110"
                                        style={{
                                            animation: `slideIn 0.5s ease-out ${idx * 100}ms backwards`,
                                        }}
                                    >
                                        <div className="rounded-2xl border-2 bg-white p-4 text-center shadow-xl">
                                            <div className="text-xs font-bold uppercase tracking-widest text-slate-600">{trickPlayerName}</div>
                                            <div className={`mt-3 text-5xl font-black ${isRed ? 'text-red-600' : 'text-slate-900'}`}>
                                                {formatCard(item.card)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* DONJI DIO - Igrač */}
            <div className="space-y-4 px-4 pb-4">
                {/* Akcije i Info */}
                <div className="grid gap-4 xl:grid-cols-[minmax(260px,300px)_1fr]">
                    {/* Lijevo - Igrač info */}
                    <div className="rounded-3xl border-2 border-white/20 bg-slate-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
                        <div className="text-sm font-bold uppercase tracking-widest text-amber-300">Tvoja ruka</div>
                        <div className="mt-3 rounded-2xl bg-slate-800/50 px-4 py-3 text-center">
                            <div className="text-xs text-slate-300">Broj karata</div>
                            <div className="text-2xl font-bold text-white">{ownHand.length}</div>
                        </div>
                        <div className="mt-2 rounded-2xl bg-slate-800/50 px-4 py-3 text-center">
                            <div className="text-xs text-slate-300">Bodovi</div>
                            <div className="text-2xl font-bold text-amber-300">{state.capturedPoints[String(currentPlayerNumber ?? 1)] ?? 0}</div>
                        </div>
                        <div className="mt-2 rounded-2xl bg-emerald-900/40 px-4 py-2 text-center text-sm">
                            {isYourTurn ? (
                                <span className="text-emerald-300">✓ Tvoj potez</span>
                            ) : (
                                <span className="text-amber-300">Čekaj red...</span>
                            )}
                        </div>
                    </div>

                    {/* Desno - Akcijski gumbi */}
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={onDrawCard}
                            disabled={!playerCanDraw}
                            className={`w-full rounded-2xl border-2 px-6 py-3 font-bold uppercase tracking-widest transition ${
                                playerCanDraw
                                    ? 'border-blue-400 bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl'
                                    : 'border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                        >
                            🃏 Povuci
                        </button>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={!canClose}
                            className={`w-full rounded-2xl border-2 px-6 py-3 font-bold uppercase tracking-widest transition ${
                                canClose
                                    ? 'border-amber-400 bg-amber-600 text-white shadow-lg hover:bg-amber-700 hover:shadow-xl'
                                    : 'border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                        >
                            🚪 Zatvori talon
                        </button>
                        <button
                            type="button"
                            onClick={handleSwap}
                            disabled={!canSwapTrump}
                            className={`w-full rounded-2xl border-2 px-6 py-3 font-bold uppercase tracking-widest transition ${
                                canSwapTrump
                                    ? 'border-purple-400 bg-purple-600 text-white shadow-lg hover:bg-purple-700 hover:shadow-xl'
                                    : 'border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                            }`}
                        >
                            ♠️ Zamijeni aduta
                        </button>
                    </div>
                </div>

                {/* Dostupne karte - Full width */}
                <div className="rounded-3xl border-2 border-white/20 bg-slate-900/80 p-4 text-white shadow-lg backdrop-blur-sm">
                    <div className="text-sm font-bold uppercase tracking-widest text-amber-300">Dostupne karte</div>
                    <div className="mt-3 flex flex-row gap-3 overflow-x-auto pb-2 justify-center">
                        {ownHand.length === 0 ? (
                            <div className="rounded-2xl bg-slate-800/50 px-4 py-3 text-center text-sm text-slate-400">
                                Nemaš karata
                            </div>
                        ) : (
                            ownHand.map((card) => {
                                const [suit, rank] = card.split('-');
                                const partner = `${suit}-${rank === 'K' ? 'Q' : 'K'}`;
                                const canDeclare = (rank === 'K' || rank === 'Q') && ownHand.includes(partner);

                                return (
                                    <div key={card} className="flex flex-col gap-1">
                                        <button
                                            type="button"
                                            onClick={handlePlay(card)}
                                            disabled={!isYourTurn}
                                            className={`transform rounded-2xl px-3 py-2 font-bold transition ${
                                                isYourTurn
                                                    ? 'cursor-pointer border-2 border-emerald-400 bg-emerald-600 text-white hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-700 hover:shadow-lg'
                                                    : 'border-2 border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                                            }`}
                                            style={{ minWidth: '80px' }}
                                        >
                                            {renderCardLabel(card)}
                                        </button>
                                        {canDeclare && onDeclareMarriage && (
                                            <button
                                                type="button"
                                                onClick={handleDeclare(card)}
                                                className="rounded-2xl border border-yellow-400 bg-gradient-to-r from-yellow-600 to-yellow-700 px-2 py-1 text-xs font-bold uppercase tracking-widest text-white shadow-md transition hover:shadow-lg"
                                            >
                                                ⭐ Brak
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px) rotate(-5deg);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) rotate(0);
                    }
                }
            `}</style>
        </div>
    );
}