import { useMemo } from 'react';
import { PlayingCard, CardBack, type CardSize } from './PlayingCard';

export type BelaTrickPlay = {
    player: number;
    card: string;
};

export type BelaDeclarations = {
    team1: number;
    team2: number;
    details: string[];
};

export type BelaState = {
    hands: Record<string, string[]>;
    trick: BelaTrickPlay[];
    trickHistory: Array<{
        plays: BelaTrickPlay[];
        winner: number;
        points: number;
    }>;
    trumpSuit: string | null;
    trumpCaller: number | null;
    teamScores: [number, number];
    roundPoints: [number, number];
    phase: 'bid' | 'play' | 'score';
    round: number;
    declarations: BelaDeclarations;
    currentTurn: number;
    dealer: number;
    turnedUpCard: string | null;
    players: Record<string, string>;
    declarationChoices: Record<string, boolean | null>;
    bids: Record<string, string>;
};

export type BelaBoardProps = {
    belaState: BelaState;
    playerNumber: number | null;
    isYourTurn: boolean;
    disabled: boolean;
    onBid: (suit?: string, pass?: boolean) => void;
    onPlay: (card: string) => void;
    playerNames: Record<number, string>;
};

type PlayerPosition = 'south' | 'west' | 'north' | 'east';

type PlayerSlot = {
    number: number;
    position: PlayerPosition;
    name: string;
    team: 0 | 1;
};

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
const SUIT_SYMBOLS: Record<string, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
};
const SUIT_NAMES_HR: Record<string, string> = {
    clubs: 'Tref',
    diamonds: 'Karo',
    hearts: 'Herc',
    spades: 'Pik',
};
const RANK_LABELS: Record<string, string> = {
    jack: 'J',
    queen: 'Q',
    king: 'K',
    ace: 'A',
};

function isRedSuit(suit: string | null): boolean {
    return suit === 'hearts' || suit === 'diamonds';
}

/** Bela cards are encoded as `${rank}_of_${suit}`, e.g. "jack_of_spades", "10_of_hearts". */
function BelaCard({ card, size = 'lg' }: { card: string; size?: CardSize }) {
    const [rankRaw, suit] = card.split('_of_');
    return <PlayingCard suit={suit} rank={RANK_LABELS[rankRaw] ?? rankRaw} size={size} />;
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

function PlayerSeat({
    name,
    isTurn,
    isDealer,
}: {
    name: string;
    isTurn: boolean;
    isDealer: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="relative">
                <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-slate-700 text-lg font-bold text-white transition ${
                        isTurn ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-50' : ''
                    }`}
                >
                    {initials(name)}
                </div>
                {isDealer && (
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white shadow">
                        D
                    </span>
                )}
            </div>
            <div className="rounded-full bg-white px-3 py-0.5 text-sm font-semibold text-slate-700 shadow-sm">
                {name}
            </div>
        </div>
    );
}

export default function BelaBoard({
    belaState,
    playerNumber,
    isYourTurn,
    disabled,
    onBid,
    onPlay,
    playerNames,
}: BelaBoardProps) {
    const getPlayerName = (num: number): string => playerNames[num] ?? `Igrač ${num}`;
    const teamOf = (num: number): 0 | 1 => ([1, 3].includes(num) ? 0 : 1);

    const isBidding = belaState.phase === 'bid';
    const passCount = Object.values(belaState.bids).filter((bid) => bid === 'pass').length;
    const mustChooseSuit = passCount >= 3 && belaState.currentTurn === 4;

    const myTeam: 0 | 1 = playerNumber ? teamOf(playerNumber) : 0;
    const theirTeam: 0 | 1 = myTeam === 0 ? 1 : 0;
    const declarations: [number, number] = [belaState.declarations.team1, belaState.declarations.team2];
    // Only the team with the strictly higher declaration ("zvanje") scores it.
    const declarationWinner: 0 | 1 | null =
        declarations[0] > declarations[1] ? 0 : declarations[1] > declarations[0] ? 1 : null;

    const playerOrder = useMemo(() => {
        const fromState = Object.keys(belaState.players)
            .map(Number)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);

        if (fromState.length > 0) {
            return fromState;
        }

        const fromNames = Object.keys(playerNames)
            .map(Number)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);

        return fromNames.length > 0 ? fromNames : [1, 2, 3, 4];
    }, [belaState.players, playerNames]);

    const currentIndex = Math.max(playerOrder.indexOf(playerNumber ?? playerOrder[0]), 0);

    const positionOf = (num: number): PlayerPosition => {
        const index = playerOrder.indexOf(num);
        const safeIndex = index === -1 ? 0 : index;
        const offset = (safeIndex - currentIndex + playerOrder.length) % playerOrder.length;
        return (['south', 'west', 'north', 'east'] as const)[offset] ?? 'south';
    };

    const seatByPosition = useMemo(() => {
        const map: Partial<Record<PlayerPosition, PlayerSlot>> = {};
        playerOrder.forEach((num) => {
            map[positionOf(num)] = {
                number: num,
                position: positionOf(num),
                name: getPlayerName(num),
                team: teamOf(num),
            };
        });
        return map;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerOrder, currentIndex, playerNames]);

    const trickCardPositionStyles: Record<PlayerPosition, string> = {
        north: 'top-0 left-1/2 -translate-x-1/2',
        west: 'left-0 top-1/2 -translate-y-1/2',
        east: 'right-0 top-1/2 -translate-y-1/2',
        south: 'bottom-0 left-1/2 -translate-x-1/2',
    };

    const handCards = playerNumber !== null ? belaState.hands[playerNumber] ?? [] : [];
    const amDealer = playerNumber !== null && belaState.dealer === playerNumber;

    const renderSeat = (position: Exclude<PlayerPosition, 'south'>) => {
        const seat = seatByPosition[position];
        if (!seat) {
            return null;
        }

        return (
            <PlayerSeat
                name={seat.name}
                isTurn={belaState.currentTurn === seat.number}
                isDealer={belaState.dealer === seat.number}
            />
        );
    };

    return (
        <div className="space-y-5">
            {/* Scoreboard */}
            <div className="mx-auto flex max-w-2xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-8 py-4 shadow-sm">
                <div className="min-w-[88px] text-center">
                    <div className="text-sm font-semibold text-slate-500">Mi</div>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-extrabold text-slate-900">{belaState.roundPoints[myTeam]}</span>
                        {declarationWinner === myTeam && declarations[myTeam] > 0 && (
                            <span className="text-sm font-semibold text-emerald-600">+{declarations[myTeam]}</span>
                        )}
                    </div>
                    <div className="text-sm font-medium text-slate-400">{belaState.teamScores[myTeam]}</div>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50 text-2xl font-bold ${
                            isRedSuit(belaState.trumpSuit) ? 'text-red-500' : 'text-slate-800'
                        }`}
                    >
                        {belaState.trumpSuit ? SUIT_SYMBOLS[belaState.trumpSuit] : '?'}
                    </div>
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        Runda {belaState.round}
                    </div>
                    {belaState.trumpCaller !== null && (
                        <div className="text-[11px] font-medium text-slate-400">
                            Zvao: {getPlayerName(belaState.trumpCaller)}
                        </div>
                    )}
                </div>

                <div className="min-w-[88px] text-center">
                    <div className="text-sm font-semibold text-slate-500">Oni</div>
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-extrabold text-slate-900">{belaState.roundPoints[theirTeam]}</span>
                        {declarationWinner === theirTeam && declarations[theirTeam] > 0 && (
                            <span className="text-sm font-semibold text-emerald-600">+{declarations[theirTeam]}</span>
                        )}
                    </div>
                    <div className="text-sm font-medium text-slate-400">{belaState.teamScores[theirTeam]}</div>
                </div>
            </div>

            {/* Table */}
            <div className="relative mx-auto min-h-[520px] max-w-3xl">
                {/* North seat */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2">{renderSeat('north')}</div>

                {/* West seat */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2">{renderSeat('west')}</div>

                {/* East seat */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">{renderSeat('east')}</div>

                {/* Trick (center cross) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative h-[260px] w-[240px]">
                        {belaState.trick.map((play) => {
                            const position = positionOf(play.player);
                            return (
                                <div
                                    key={`${play.player}-${play.card}`}
                                    className={`absolute ${trickCardPositionStyles[position]}`}
                                >
                                    {/* Inner wrapper carries the fly-in animation so it
                                        doesn't clobber the parent's centering transform. */}
                                    <div
                                        style={{
                                            animation: `bela-fly-${position} 0.45s cubic-bezier(0.22, 1, 0.36, 1) both`,
                                        }}
                                    >
                                        <BelaCard card={play.card} size="lg" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Turn badge */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                    <span
                        className={`rounded-full px-6 py-2 text-sm font-semibold shadow-sm ${
                            isYourTurn
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-200 text-slate-500'
                        }`}
                    >
                        {isYourTurn ? 'Tvoj potez' : `Na potezu: ${getPlayerName(belaState.currentTurn)}`}
                    </span>
                </div>
            </div>

            {/* Bidding */}
            {isBidding && (
                <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                        Zovi aduta
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {SUITS.map((suit) => (
                            <button
                                key={suit}
                                type="button"
                                onClick={() => onBid(suit)}
                                disabled={!isYourTurn || disabled}
                                className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <span className={`text-xl ${isRedSuit(suit) ? 'text-red-500' : 'text-slate-800'}`}>
                                    {SUIT_SYMBOLS[suit]}
                                </span>
                                {SUIT_NAMES_HR[suit]}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => onBid(undefined, true)}
                            disabled={!isYourTurn || disabled || mustChooseSuit}
                            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Dalje
                        </button>
                    </div>
                    {mustChooseSuit && (
                        <div className="mt-3 text-sm text-slate-500">Moraš zvati — ne smiješ dalje.</div>
                    )}
                </div>
            )}

            {/* Hand tray */}
            <div className="relative mx-auto max-w-4xl rounded-3xl border border-emerald-200 bg-emerald-100/70 p-5">
                {amDealer && (
                    <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white shadow">
                        D
                    </span>
                )}
                {handCards.length === 0 ? (
                    <div className="py-10 text-center text-sm text-emerald-700/70">Nemaš karata.</div>
                ) : (
                    <div className="flex flex-wrap items-end justify-center gap-2.5">
                        {handCards.map((card, index) => {
                            const hidden = card === '__HIDDEN__';
                            const playable = !hidden && isYourTurn && !disabled && belaState.phase === 'play';
                            return (
                                <button
                                    key={`${card}-${index}`}
                                    type="button"
                                    onClick={() => playable && onPlay(card)}
                                    disabled={!playable}
                                    className={`rounded-lg transition enabled:hover:-translate-y-3 enabled:hover:shadow-xl disabled:cursor-default ${
                                        playable ? '' : 'opacity-95'
                                    }`}
                                >
                                    {hidden ? <CardBack size="xl" /> : <BelaCard card={card} size="xl" />}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes bela-fly-south {
                    from { transform: translateY(190px) scale(0.8); opacity: 0; }
                    60%  { opacity: 1; }
                    to   { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes bela-fly-north {
                    from { transform: translateY(-190px) scale(0.8); opacity: 0; }
                    60%  { opacity: 1; }
                    to   { transform: translateY(0) scale(1); opacity: 1; }
                }
                @keyframes bela-fly-west {
                    from { transform: translateX(-230px) scale(0.8); opacity: 0; }
                    60%  { opacity: 1; }
                    to   { transform: translateX(0) scale(1); opacity: 1; }
                }
                @keyframes bela-fly-east {
                    from { transform: translateX(230px) scale(0.8); opacity: 0; }
                    60%  { opacity: 1; }
                    to   { transform: translateX(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
