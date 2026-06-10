import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { PlayingCard as BasePlayingCard, CardBack, type CardSize } from './PlayingCard';

export type SnapsTrickItem = {
    player: number;
    card: string;
    marriagePoints?: number;
};

export type SnapsState = {
    currentTurn: number;
    players: Record<string, string>;
    hands: Record<string, string[]>;
    stock: string[];
    trumpCard: string;
    trick: SnapsTrickItem[];
    lastTrick?: SnapsTrickItem[];
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

/** Snaps cards are encoded as `${suit}-${rank}`, e.g. "H-J"; the face itself is drawn by the shared renderer. */
function PlayingCard({ card, size = 'md' }: { card: string; size?: CardSize }) {
    const [suit, rank] = card.split('-');
    return <BasePlayingCard suit={suit} rank={rank} size={size} />;
}

function PlayerBadge({
    name,
    score,
    points,
    active,
}: {
    name: string;
    score: number;
    points: number;
    active: boolean;
}) {
    const initial = name.charAt(0).toUpperCase() || '?';

    return (
        <div
            className={`flex items-center gap-3 rounded-2xl px-3 py-2 backdrop-blur-sm transition ${
                active
                    ? 'bg-amber-400/20 ring-2 ring-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.5)]'
                    : 'bg-black/35 ring-1 ring-white/10'
            }`}
        >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-700 font-black text-white shadow">
                {initial}
            </div>
            <div className="leading-tight">
                <div className="text-sm font-bold text-white">{name}</div>
                <div className="text-xs text-amber-200">
                    {score} <span className="text-amber-100/60">· {points} bod</span>
                </div>
            </div>
        </div>
    );
}

function ActionButton({
    icon,
    label,
    onClick,
    enabled,
}: {
    icon: string;
    label: string;
    onClick?: () => void;
    enabled: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!enabled}
            title={label}
            className={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl border text-2xl shadow-lg transition ${
                enabled
                    ? 'border-amber-300/60 bg-amber-700/85 text-white hover:scale-105 hover:bg-amber-600'
                    : 'cursor-not-allowed border-white/10 bg-black/30 text-white/25'
            }`}
        >
            <span>{icon}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
        </button>
    );
}

const BURST_CLIP =
    'polygon(50% 0%, 58% 20%, 79% 9%, 75% 32%, 98% 35%, 80% 50%, 98% 65%, 75% 68%, 79% 91%, 58% 80%, 50% 100%, 42% 80%, 21% 91%, 25% 68%, 2% 65%, 20% 50%, 2% 35%, 25% 32%, 21% 9%, 42% 20%)';

/** Comic-book starburst stamp shown when a player wins a štih. */
function ComicBurst({ winner }: { winner: string }) {
    return (
        <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
            style={{ animation: 'burstPop 0.45s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
            <div className="relative flex h-44 w-44 items-center justify-center">
                <div
                    className="absolute inset-0"
                    style={{ clipPath: BURST_CLIP, background: 'linear-gradient(135deg, #fde047, #f59e0b)' }}
                />
                <div
                    className="absolute inset-[6px]"
                    style={{ clipPath: BURST_CLIP, background: 'linear-gradient(135deg, #fffbeb, #fcd34d)' }}
                />
                <div className="relative flex w-[124px] -rotate-6 flex-col items-center text-center">
                    <span className="break-words text-xl font-black leading-tight text-amber-900">{winner}</span>
                    <span className="mt-0.5 text-sm font-black uppercase tracking-widest text-amber-700">
                        osvaja štih!
                    </span>
                </div>
            </div>
        </div>
    );
}

export const SNAPS_TABLE_STYLE: CSSProperties = {
    backgroundColor: '#6b4423',
    backgroundImage:
        'radial-gradient(ellipse at 50% 40%, rgba(196,138,78,0.55), rgba(80,50,25,0) 62%), repeating-linear-gradient(92deg, rgba(0,0,0,0.05) 0 2px, transparent 2px 6px), linear-gradient(180deg, #7c5028, #4a2f18)',
};

export default function SnapsBoard({
    state,
    currentPlayerNumber,
    isYourTurn,
    isFinished,
    playerNames,
    onPlayCard,
    onDrawCard,
    onClose,
    onSwapTrump,
    onDeclareMarriage,
}: SnapsBoardProps) {
    const opponentNumber = currentPlayerNumber === 1 ? 2 : 1;
    const ownHand = currentPlayerNumber ? state.hands[String(currentPlayerNumber)] ?? [] : [];
    const opponentHandCount = state.hands[String(opponentNumber)]?.length ?? 0;
    const isClosed = state.closed ?? false;

    const meKey = String(currentPlayerNumber ?? 1);
    const oppKey = String(opponentNumber);
    const myName = playerNames[state.players[meKey]] ?? `Igrač ${meKey}`;
    const opponentName = playerNames[state.players[oppKey]] ?? `Igrač ${opponentNumber}`;
    const closedByLabel = state.closedBy
        ? playerNames[state.players[String(state.closedBy)]] ?? `Igrač ${state.closedBy}`
        : null;

    const lastTrick = state.lastTrick ?? [];
    // When a trick completes the server sweeps the live trick immediately, so we briefly
    // replay the finished trick (lastTrick) — long enough for both players to see what was
    // played and who won — then clear the table for the new round's draw + lead.
    const lastTrickKey = lastTrick.map((item) => `${item.player}:${item.card}`).join(',');
    const [resultVisible, setResultVisible] = useState(false);
    const [showBurst, setShowBurst] = useState(false);
    const shownKeyRef = useRef<string>('');

    useEffect(() => {
        if (state.trick.length > 0) {
            shownKeyRef.current = '';
            setResultVisible(false);
            setShowBurst(false);
            return;
        }

        if (lastTrickKey && lastTrickKey !== shownKeyRef.current) {
            shownKeyRef.current = lastTrickKey;
            setResultVisible(true);
            setShowBurst(true);
            const burstTimer = window.setTimeout(() => setShowBurst(false), 1500);
            const sweepTimer = window.setTimeout(() => setResultVisible(false), 2200);

            return () => {
                window.clearTimeout(burstTimer);
                window.clearTimeout(sweepTimer);
            };
        }
    }, [state.trick.length, lastTrickKey]);

    const showingResult = state.trick.length === 0 && resultVisible && lastTrick.length > 0;
    const trickDisplay = state.trick.length > 0 ? state.trick : showingResult ? lastTrick : [];

    const trickWinnerName =
        state.lastTrickWinner != null
            ? playerNames[state.players[String(state.lastTrickWinner)]] ?? `Igrač ${state.lastTrickWinner}`
            : null;

    const playerCanDraw =
        currentPlayerNumber !== null &&
        state.drawQueue.length > 0 &&
        state.drawQueue[0] === currentPlayerNumber &&
        isYourTurn &&
        state.stock.length > 0 &&
        !isFinished &&
        !isClosed;

    const handlePlay = (card: string) => (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!isYourTurn || currentPlayerNumber === null) return;
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

    const handleDeclare = (card: string) => (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!isYourTurn || !onDeclareMarriage) return;
        onDeclareMarriage(card);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden" style={SNAPS_TABLE_STYLE}>
            {/* Opponent badge */}
            <div className="absolute left-5 top-5 z-10">
                <PlayerBadge
                    name={opponentName}
                    score={state.scores[oppKey] ?? 0}
                    points={state.capturedPoints[oppKey] ?? 0}
                    active={state.currentTurn === opponentNumber && !isFinished}
                />
            </div>

            {/* Opponent hand (face down, fanned) */}
            <div className="absolute left-1/2 top-6 flex -translate-x-1/2">
                {Array.from({ length: Math.min(opponentHandCount, 6) }).map((_, i) => (
                    <CardBack key={i} size="md" className={i === 0 ? '' : '-ml-7'} />
                ))}
            </div>

            {/* Talon + trump (right) */}
            <div className="absolute right-6 top-24 z-10 flex flex-col items-center gap-2">
                <div className="relative flex h-28 w-36 items-center">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 rotate-90 drop-shadow-lg">
                        <PlayingCard card={state.trumpCard} size="md" />
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        {state.stock.length > 0 ? (
                            <div className="relative h-24 w-16">
                                <CardBack className="absolute left-1.5 top-1.5 opacity-60" />
                                <CardBack className="absolute left-0.5 top-0.5 opacity-80" />
                                <CardBack className="absolute left-0 top-0" />
                            </div>
                        ) : (
                            <div className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-amber-200/30 text-[10px] uppercase tracking-wide text-amber-200/40">
                                prazno
                            </div>
                        )}
                    </div>
                </div>
                <div className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-100">
                    Špil {state.stock.length}
                </div>
                {isClosed && (
                    <div className="max-w-[150px] rounded-xl border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-center text-[11px] text-amber-100">
                        ✓ Talon zatvoren{closedByLabel ? ` (${closedByLabel})` : ''}
                    </div>
                )}
            </div>

            {/* Center trick area */}
            <div className="absolute inset-0 flex items-center justify-center gap-10 px-40">
                {trickDisplay.length === 0 ? (
                    <div className="text-center text-amber-100/55">
                        {playerCanDraw ? (
                            <>
                                <div className="text-lg font-semibold tracking-wide">Povuci kartu</div>
                                <div className="mt-1 text-sm text-amber-100/40">Vuci kartu sa špila za novi krug →</div>
                            </>
                        ) : state.drawQueue.length > 0 && !isFinished ? (
                            <>
                                <div className="text-lg font-semibold tracking-wide">Vučenje karata</div>
                                <div className="mt-1 text-sm text-amber-100/40">Protivnik vuče kartu sa špila…</div>
                            </>
                        ) : isYourTurn && !isFinished ? (
                            <>
                                <div className="text-lg font-semibold tracking-wide">Tvoj potez</div>
                                <div className="mt-1 text-sm text-amber-100/40">Odigraj kartu iz svoje ruke</div>
                            </>
                        ) : !isFinished ? (
                            <>
                                <div className="text-lg font-semibold tracking-wide">Na potezu je protivnik</div>
                                <div className="mt-1 text-sm text-amber-100/40">Pričekaj…</div>
                            </>
                        ) : (
                            <div className="text-lg font-semibold tracking-wide">Stol je prazan</div>
                        )}
                    </div>
                ) : (
                    trickDisplay.map((item, idx) => {
                        const isOpponentCard = item.player === opponentNumber;
                        const playerLabel =
                            playerNames[state.players[String(item.player)]] ?? `Igrač ${item.player}`;
                        const isTrickWinner = showingResult && item.player === state.lastTrickWinner;

                        return (
                            <div
                                key={`${item.player}-${item.card}`}
                                className="flex flex-col items-center gap-2"
                                style={{
                                    animation: isOpponentCard
                                        ? `slideInOpponent 0.6s ease-out ${idx * 100}ms backwards`
                                        : `slideIn 0.5s ease-out ${idx * 100}ms backwards`,
                                }}
                            >
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide transition ${
                                        isTrickWinner
                                            ? 'bg-amber-300 text-amber-900'
                                            : 'bg-black/40 text-amber-100/80'
                                    }`}
                                >
                                    {playerLabel}
                                </span>
                                <div className={showingResult && !isTrickWinner ? 'opacity-70' : ''}>
                                    <PlayingCard card={item.card} size="lg" />
                                </div>
                            </div>
                        );
                    })
                )}

                {showBurst && trickWinnerName && <ComicBurst winner={trickWinnerName} />}
            </div>

            {/* My badge + turn indicator (bottom left) */}
            <div className="absolute bottom-6 left-5 z-10 flex flex-col gap-2">
                <PlayerBadge
                    name={myName}
                    score={state.scores[meKey] ?? 0}
                    points={state.capturedPoints[meKey] ?? 0}
                    active={isYourTurn}
                />
                <div
                    className={`rounded-xl px-3 py-1.5 text-center text-xs font-semibold ${
                        isYourTurn ? 'bg-emerald-500/25 text-emerald-200' : 'bg-black/30 text-amber-100/70'
                    }`}
                >
                    {isYourTurn ? '✓ Tvoj potez' : 'Čekaj red…'}
                </div>
            </div>

            {/* Player hand (bottom, fanned) */}
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-end">
                {ownHand.length === 0 ? (
                    <div className="rounded-2xl bg-black/30 px-5 py-3 text-sm text-amber-100/50">Nemaš karata</div>
                ) : (
                    ownHand.map((card, i) => {
                        const [suit, rank] = card.split('-');
                        const partner = `${suit}-${rank === 'K' ? 'Q' : 'K'}`;
                        const canDeclare = (rank === 'K' || rank === 'Q') && ownHand.includes(partner);

                        return (
                            <div key={card} className={`relative ${i === 0 ? '' : '-ml-5'}`}>
                                {canDeclare && onDeclareMarriage && (
                                    <button
                                        type="button"
                                        onClick={handleDeclare(card)}
                                        title="Prijavi brak"
                                        className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-500 to-yellow-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md transition hover:scale-110"
                                    >
                                        ⭐ Brak
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handlePlay(card)}
                                    disabled={!isYourTurn}
                                    className={`block transition-transform ${
                                        isYourTurn
                                            ? 'cursor-pointer hover:-translate-y-5 hover:drop-shadow-xl'
                                            : 'cursor-not-allowed opacity-90'
                                    }`}
                                >
                                    <PlayingCard card={card} size="lg" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Action buttons (bottom right) */}
            <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
                <ActionButton icon="🃏" label="Povuci" onClick={onDrawCard} enabled={playerCanDraw} />
                <ActionButton icon="🚪" label="Zatvori" onClick={handleClose} enabled={canClose} />
                <ActionButton icon="♠️" label="Adut" onClick={handleSwap} enabled={canSwapTrump} />
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px) rotate(-5deg); }
                    to { opacity: 1; transform: translateY(0) rotate(0); }
                }

                @keyframes slideInOpponent {
                    from { opacity: 0; transform: translateY(-30px) rotate(8deg) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) rotate(0) scale(1); }
                }

                @keyframes burstPop {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(-25deg); }
                    70% { transform: translate(-50%, -50%) scale(1.12) rotate(4deg); }
                    100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
                }
            `}</style>
        </div>
    );
}
