import { useMemo } from 'react';

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

const IMAGE_BASE = '/images/poker_cards';
const CARD_BACK = '/images/poker_cards/card_background.svg';
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
const SUIT_LABELS: Record<string, string> = {
    clubs: '♣ Clubs',
    diamonds: '♦ Diamonds',
    hearts: '♥ Hearts',
    spades: '♠ Spades',
};
const TRUMP_SYMBOLS: Record<string, string> = {
    clubs: '♣',
    diamonds: '♦',
    hearts: '♥',
    spades: '♠',
};

function cardImagePath(card: string): string {
    return `${IMAGE_BASE}/${card}.svg`;
}

function getTrumpSymbol(suit: string | null): string {
    if (!suit) return 'N/A';
    return TRUMP_SYMBOLS[suit] ?? suit;
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
    const getPlayerName = (playerNumber: number): string => {
        return playerNames[playerNumber] ?? `Igrač ${playerNumber}`;
    };

    const getTeamLabel = (playerNumber: number): string => ([1, 3].includes(playerNumber) ? 'Tim 1' : 'Tim 2');

    const currentPlayerName = getPlayerName(belaState.currentTurn);
    const isBidding = belaState.phase === 'bid';
    const passCount = Object.values(belaState.bids).filter((bid) => bid === 'pass').length;
    const mustChooseSuit = passCount >= 3 && belaState.currentTurn === 4;

    const declarationSummary = useMemo(() => {
        const { team1, team2 } = belaState.declarations;

        if (team1 === 0 && team2 === 0) {
            return 'Nema zvanja.';
        }

        if (team1 === team2) {
            return `Zvanja su izjednačena: ${team1} pts.`;
        }

        if (team1 > team2) {
            return `Tim 1 ima jače zvanje: ${team1} pts.`;
        }

        return `Tim 2 ima jače zvanje: ${team2} pts.`;
    }, [belaState.declarations]);

    type PlayerPosition = 'south' | 'west' | 'north' | 'east';

    const playerNumbers = useMemo(() => {
        const fromState = Object.keys(belaState.players)
            .map(Number)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);

        if (fromState.length > 0) {
            return fromState;
        }

        return Object.keys(playerNames)
            .map(Number)
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);
    }, [belaState.players, playerNames]);

    const playerOrder = playerNumbers.length > 0 ? playerNumbers : [1, 2, 3, 4];
    const currentIndex = Math.max(playerOrder.indexOf(playerNumber ?? playerOrder[0]), 0);

    const playerSlots = useMemo(() => {
        return playerOrder.map((number, index) => {
            const offset = (index - currentIndex + playerOrder.length) % playerOrder.length;
            const position = ['south', 'west', 'north', 'east'][offset] as PlayerPosition;
            return {
                number,
                position,
                name: getPlayerName(number),
                team: getTeamLabel(number),
            };
        });
    }, [playerOrder, currentIndex]);

    const getTrickCardPosition = (playerNum: number): PlayerPosition => {
        const playerIndex = playerOrder.indexOf(playerNum);
        const index = playerIndex === -1 ? 0 : playerIndex;
        const offset = (index - currentIndex + playerOrder.length) % playerOrder.length;
        return ['south', 'west', 'north', 'east'][offset] as PlayerPosition;
    };

    const trickCardPositionStyles: Record<PlayerPosition, string> = {
        north: 'top-0 left-1/2 -translate-x-1/2',
        west: 'top-1/2 left-0 -translate-y-1/2',
        east: 'top-1/2 right-0 -translate-y-1/2',
        south: 'bottom-0 left-1/2 -translate-x-1/2',
    };

    const renderPlayerPanel = (player: { number: number; position: PlayerPosition; name: string; team: string }) => {
        // Only render opponent panels (not south/player's own hand)
        if (player.position === 'south') {
            return null;
        }

        const positionStyles: Record<Exclude<PlayerPosition, 'south'>, string> = {
            north: 'top-4 left-1/2 -translate-x-1/2 w-full max-w-[300px]',
            west: 'left-4 top-1/2 -translate-y-1/2 w-[300px]',
            east: 'right-4 top-1/2 -translate-y-1/2 w-[300px]',
        };

        const handCards = belaState.hands[String(player.number)] ?? [];

        return (
            <div key={player.number} className={`absolute ${positionStyles[player.position]}`}>
                <div className="px-5 py-2 rounded-full bg-black/40 backdrop-blur-sm text-white text-base font-semibold">
                    {player.team}
                </div>
                <div className="mt-1 px-5 py-2 rounded-full bg-black/40 backdrop-blur-sm text-white text-2xl font-bold">
                    {player.name}
                </div>

                <div className="mt-6 flex flex-col items-center justify-center gap-3">
                    <div
                        className={`relative ${
                            belaState.currentTurn === player.number ? "turn-glow-strong" : ""
                        }`}
                    >
                        <img
                            src={CARD_BACK}
                            alt="card back"
                            className="h-28 w-20 rounded-none"  // bigger card
                        />
                    </div>
                </div>

</div>
        );
    };

    const renderPlayerHand = () => {
        if (playerNumber === null) {
            return null;
        }

        const handCards = belaState.hands[playerNumber];

        console.log("FULL HANDS =", belaState.hands);
        console.log("handCards =", handCards);

        return (
            <div
                className={`rounded-3xl border border-slate-200 bg-white p-6 ${
                    isYourTurn ? "shadow-[0_0_22px_8px_rgba(255,215,0,0.75)]" : ""
                }`}
            >
                <div className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-500">Your hand</div>
                <div className="grid grid-cols-8 gap-3 md:grid-cols-10">
                    {handCards.map((card, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => card !== "__HIDDEN__" && onPlay(card)}
                            disabled={
                                card === "__HIDDEN__" ||
                                !isYourTurn ||
                                disabled ||
                                belaState.phase !== 'play'
                            }
                            className="transition disabled:cursor-not-allowed disabled:opacity-60 hover:scale-110 hover:shadow-lg"
                        >
                            {card === "__HIDDEN__" ? (
                                <img
                                    src="/images/poker_cards/card_background.svg"
                                    alt="Hidden card"
                                    className="h-32 w-24 rounded-none shadow-sm opacity-80"
                                />
                            ) : (
                                <img
                                    src={cardImagePath(card)}
                                    alt={card}
                                    className="h-32 w-24 rounded-none shadow-sm"
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Adut</div>
                    <div className="mt-3 text-3xl font-semibold text-slate-900">
                        {belaState.trumpSuit ? getTrumpSymbol(belaState.trumpSuit) : 'N/A'}
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{belaState.trumpCaller ? `Igrač ${belaState.trumpCaller}` : 'Još nije izabran'}</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Poeni runde</div>
                    <div className="mt-3 text-3xl font-semibold text-slate-900">{belaState.roundPoints[0]} - {belaState.roundPoints[1]}</div>
                    <p className="mt-2 text-sm text-slate-500">Poeni osvojeni u ovoj rundi</p>
                    <div className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-700">
                        {declarationSummary}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm uppercase tracking-[0.24em] text-slate-500">Runda</div>
                            <div className="mt-2 text-3xl font-semibold text-slate-900">{belaState.round}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Tim 1</div>
                            <div className="text-2xl font-semibold text-slate-900">{belaState.teamScores[0]}</div>
                            <div className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-400">Tim 2</div>
                            <div className="text-2xl font-semibold text-slate-900">{belaState.teamScores[1]}</div>
                        </div>
                    </div>
                </div>
            </div>

            {isBidding && (
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="mb-4 text-sm uppercase tracking-[0.24em] text-slate-500">Odabir aduta</div>
                    <div className="grid gap-3 md:grid-cols-5">
                        {SUITS.map((suit) => (
                            <button
                                key={suit}
                                type="button"
                                onClick={() => onBid(suit)}
                                disabled={!isYourTurn || disabled}
                                className="rounded-3xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {SUIT_LABELS[suit]}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => onBid(undefined, true)}
                            disabled={!isYourTurn || disabled || mustChooseSuit}
                            className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Pass
                        </button>
                    </div>
                    <div className="mt-4 text-sm text-slate-500">
                        {passCount} player{passCount === 1 ? '' : 's'} passed
                        {mustChooseSuit ? ' — this player must choose a suit' : ''}
                    </div>
                </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 pb-10">
                <div className="min-h-[760px] bg-green-300 flex flex-col items-center justify-start relative pt-24">
                    {playerSlots.map((player) => renderPlayerPanel(player))}

                    <div className="w-full px-4" style={{ marginTop: "10rem" }}>
                        <div className="mx-auto w-full max-w-[24rem] p-6">
                            <div className="relative h-[280px]">
                                {belaState.trick.length > 0 && (
                                    <div className="relative h-[280px]">
                                        {belaState.trick.map((play) => {
                                            const position = getTrickCardPosition(play.player);
                                            return (
                                                <div
                                                    key={`${play.player}-${play.card}`}
                                                    className={`absolute ${trickCardPositionStyles[position]} flex flex-col items-center justify-center`}
                                                    style={{ animation: 'bela-play-card 0.35s ease-out' }}
                                                >
                                                    <img
                                                        src={cardImagePath(play.card)}
                                                        alt={play.card}
                                                        className="h-32 w-24 rounded-none shadow-md"
                                                    />
                                                    <p className="mt-3 text-center text-xs uppercase tracking-[0.24em] text-slate-500 font-semibold">
                                                        P{play.player}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {renderPlayerHand()}

            <style>{`
                @keyframes bela-play-card {
                    from { transform: translateY(-12px) scale(0.96); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
