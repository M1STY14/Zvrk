import { useEffect, useRef, useState } from 'react';

export type UnoCard = {
    color: string;
    type: string;
    value: number | null;
};

export type UnoState = {
    ownHand: UnoCard[];
    opponentHandSizes: Record<number, number>;
    discardPileTop: UnoCard | null;
    discardPileRecent: UnoCard[];
    drawPileCount: number;
    currentTurn: number;
    direction: 1 | -1;
    currentColor: string;
    players: Record<number, string>;
    drewThisTurn: boolean;
    forfeited: number[];
};

export type UnoBoardProps = {
    unoState: UnoState;
    isYourTurn: boolean;
    disabled: boolean;
    playerNumber: number | null;
    onPlayCard: (cardIndex: number, wildColor?: string) => void;
    onDraw: () => void;
    onPass: () => void;
    opponentDrawAnim?: { player: number; seq: number } | null;
    opponentPlayAnim?: { player: number; seq: number } | null;
};

const COLOR_BG: Record<string, string> = {
    red: '#e53935',
    green: '#43a047',
    blue: '#1e88e5',
    yellow: '#fdd835',
    wild: '#212121',
};

const COLOR_LABEL: Record<string, string> = {
    red: 'Crvena',
    green: 'Zelena',
    blue: 'Plava',
    yellow: 'Žuta',
};


function cardSrc(card: UnoCard): string {
    if (card.color === 'wild') {
        return card.type === 'wild_draw_four'
            ? '/images/UNO_cards/uno_card_wild_draw_four.svg'
            : '/images/UNO_cards/uno_card_wild.svg';
    }
    const type = card.type === 'number' ? String(card.value) : card.type;
    return `/images/UNO_cards/uno_card_${card.color}_${type}.svg`;
}

function CardFace({
    card,
    w = 72,
    h = 108,
    selected = false,
    playable = false,
    rotation = 0,
    extraStyle,
    onClick,
}: {
    card: UnoCard;
    w?: number;
    h?: number;
    selected?: boolean;
    playable?: boolean;
    rotation?: number;
    extraStyle?: React.CSSProperties;
    onClick?: () => void;
}) {
    const bg = COLOR_BG[card.color] ?? '#212121';
    const lift = selected ? -24 : playable ? -10 : 0;

    return (
        <div
            onClick={onClick}
            style={{
                width: w,
                height: h,
                borderRadius: Math.round(w * 0.13),
                boxShadow: selected
                    ? `0 0 0 3px ${bg}, 0 0 16px ${bg}80, 0 12px 32px rgba(0,0,0,0.55)`
                    : playable
                      ? '0 0 0 2px rgba(255,255,255,0.55), 0 8px 20px rgba(0,0,0,0.4)'
                      : 'none',
                cursor: onClick ? 'pointer' : 'default',
                transform: `rotate(${rotation}deg) translateY(${lift}px) scale(${selected ? 1.12 : 1})`,
                transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s',
                animation: selected ? 'cardPulse 1.2s ease-in-out infinite' : 'none',
                userSelect: 'none',
                flexShrink: 0,
                overflow: 'hidden',
                display: 'block',
                ...extraStyle,
            }}
        >
            <img
                src={cardSrc(card)}
                width={w}
                height={h}
                style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
            />
        </div>
    );
}

function CardBack({ w = 54, h = 80, rotation = 0 }: { w?: number; h?: number; rotation?: number }) {
    return (
        <div style={{
            width: w,
            height: h,
            borderRadius: Math.round(w * 0.12),
            flexShrink: 0,
            transform: `rotate(${rotation}deg)`,
            overflow: 'hidden',
            display: 'block',
        }}>
            <img
                src="/images/UNO_cards/uno_card_back.svg"
                width={w}
                height={h}
                style={{ display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                draggable={false}
            />
        </div>
    );
}

/** Fan of opponent's card backs — cards face inward (rotated 180°), arc opens upward */
function OpponentFan({ count, name, isActive, lastCardRef }: {
    count: number;
    name: string;
    isActive: boolean;
    lastCardRef?: (el: HTMLDivElement | null) => void;
}) {
    const visible = Math.min(count, 12);
    const W = 80;
    const H = 120;
    const spacing = Math.min(36, 440 / Math.max(visible, 1));
    const totalW = visible > 1 ? (visible - 1) * spacing + W : W;
    const containerW = totalW + 60;
    const maxTilt = Math.min(visible * 6, 50);
    const arcDepth = 28;
    const containerH = H + arcDepth + 8;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {/* Name + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                    key={isActive ? 'active' : 'inactive'}
                    style={{
                        fontSize: 13, fontWeight: 700,
                        color: isActive ? '#fbbf24' : '#94a3b8',
                        textShadow: isActive ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
                        animation: isActive ? 'playerActivePulse 0.55s ease-out forwards' : 'none',
                        display: 'inline-block',
                    }}
                >{name}</span>
                <span style={{
                    fontSize: 12, fontWeight: 700,
                    background: 'transparent',
                    border: `1.5px solid ${isActive ? '#fbbf24' : '#94a3b8'}`,
                    borderRadius: 100,
                    width: 28, height: 28,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: isActive ? '#fbbf24' : '#94a3b8',
                }}>{count}</span>
            </div>
            {/* Fan container */}
            <div style={{ position: 'relative', width: containerW, height: containerH }}>
                {Array.from({ length: visible }).map((_, i) => {
                    const t = visible > 1 ? i / (visible - 1) - 0.5 : 0;
                    const xPx = t * (visible - 1) * spacing;
                    const yPx = (0.25 - t * t) * arcDepth * 4;
                    const tilt = -t * maxTilt * 2;
                    const isLast = i === visible - 1;
                    return (
                        <div
                            key={i}
                            ref={isLast ? lastCardRef : undefined}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: yPx,
                                zIndex: i,
                                transform: `translateX(calc(-50% + ${xPx}px)) rotate(${180 + tilt}deg)`,
                                transformOrigin: 'center center',
                            }}
                        >
                            <CardBack w={W} h={H} />
                        </div>
                    );
                })}
                {count > 12 && (
                    <span style={{
                        position: 'absolute', right: 0, top: 0,
                        background: '#334155', color: 'white',
                        fontSize: 10, fontWeight: 700, borderRadius: 100,
                        padding: '2px 6px', zIndex: 20,
                    }}>+{count - 12}</span>
                )}
            </div>
        </div>
    );
}

/** Player's hand in a centred fan arc */
function PlayerFan({
    hand,
    selectedIdx,
    wildPendingIdx,
    isYourTurn,
    disabled,
    isPlayable,
    onCardClick,
    onWildColor,
    lastCardRef,
    hideLastCard = false,
}: {
    hand: UnoCard[];
    selectedIdx: number | null;
    wildPendingIdx: number | null;
    isYourTurn: boolean;
    disabled: boolean;
    isPlayable: (card: UnoCard, idx?: number) => boolean;
    onCardClick: (idx: number) => void;
    onWildColor: (color: string) => void;
    lastCardRef?: React.Ref<HTMLDivElement>;
    hideLastCard?: boolean;
}) {
    const count = hand.length;
    if (count === 0) return <span style={{ color: '#64748b', fontSize: 14 }}>Nema karata!</span>;

    const W = count > 9 ? Math.max(84, Math.round(116 * (9 / count))) : 116;
    const H = Math.round(W * 1.5);
    const maxSpreadDeg = Math.min(count * 9, 130);
    const startDeg = -maxSpreadDeg / 2;
    const stepDeg = count > 1 ? maxSpreadDeg / (count - 1) : 0;
    const spacing = Math.min(W * 0.38, 380 / Math.max(count, 1));
    const totalW = count > 1 ? (count - 1) * spacing + W : W;
    const containerW = totalW + 80;
    const containerH = H + 180;

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: containerW, height: containerH }}>
                {hand.map((card, idx) => {
                    const t = count > 1 ? idx / (count - 1) - 0.5 : 0;
                    const xPx = t * (count - 1) * spacing;
                    const yPx = (t * t) * 30;
                    const deg = startDeg + idx * stepDeg;
                    const playable = isPlayable(card, idx);
                    const selected = selectedIdx === idx;
                    const isWildPending = wildPendingIdx === idx;

                    const isLast = idx === count - 1;

                    return (
                        <div
                            key={idx}
                            ref={isLast ? lastCardRef : undefined}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: 0,
                                transform: `translateX(calc(-50% + ${xPx}px)) translateY(${yPx}px)`,
                                zIndex: selected ? 200 : idx,
                                opacity: (isLast && hideLastCard) ? 0 : !isYourTurn || disabled ? 0.75 : playable ? 1 : 0.4,
                                transition: (isLast && hideLastCard) ? 'none' : 'opacity 0.15s',
                            }}
                            onClick={() => onCardClick(idx)}
                        >
                            <CardFace
                                card={card}
                                w={W}
                                h={H}
                                selected={selected}
                                playable={playable && !selected}
                                rotation={deg * 0.5}
                            />
                            {/* Color picker — above wild card */}
                            {isWildPending && (
                                <div style={{ position: 'absolute', bottom: H + 48, left: '50%', transform: 'translateX(calc(-50% + 55px))', zIndex: 300, width: containerW, pointerEvents: 'none' }}>
                                    <div style={{ position: 'relative', width: containerW, height: H + 60, pointerEvents: 'auto' }}>
                                        {Object.keys(COLOR_LABEL).map((color, ci) => {
                                            const offset = ci - 1.5;
                                            const virtualIdx = idx + offset;
                                            const vt = count > 1 ? virtualIdx / (count - 1) - 0.5 : offset / 4;
                                            const cxPx = vt * (count - 1) * spacing - xPx;
                                            const cyPx = (vt * vt) * 30 - yPx;
                                            const cdeg = (startDeg + virtualIdx * stepDeg) * 0.5;
                                            return (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); onWildColor(color); }}
                                                    style={{
                                                        position: 'absolute', left: '50%', bottom: -cyPx,
                                                        transform: `translateX(calc(-50% + ${cxPx}px)) rotate(${cdeg}deg)`,
                                                        transformOrigin: 'bottom center',
                                                        background: 'none', border: 'none', padding: 0,
                                                        cursor: 'pointer', transition: 'transform 0.15s', zIndex: ci + 10,
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = `translateX(calc(-50% + ${cxPx}px)) rotate(${cdeg}deg) translateY(-16px) scale(1.1)`; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = `translateX(calc(-50% + ${cxPx}px)) rotate(${cdeg}deg)`; }}
                                                >
                                                    <img
                                                        src={`/images/UNO_cards/uno_wildcard_choice/UNO_WILDCARD_CHOICE_${color.toUpperCase()}.svg`}
                                                        width={Math.round(W * 0.6)} height={Math.round(H * 0.6)}
                                                        style={{ display: 'block', pointerEvents: 'none', borderRadius: Math.round(W * 0.1), boxShadow: `0 6px 18px ${COLOR_BG[color]}90` }}
                                                        draggable={false}
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function UnoBoard({
    unoState,
    isYourTurn,
    disabled,
    playerNumber: _playerNumber,
    onPlayCard,
    onDraw,
    onPass: _onPass,
    opponentDrawAnim,
    opponentPlayAnim,
}: UnoBoardProps) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [wildPendingIdx, setWildPendingIdx] = useState<number | null>(null);
    // draw fly: poleđina leti, pa flip reveal na odredištu
    const [flyCard, setFlyCard] = useState<{ fromX: number; fromY: number; toX: number; toY: number; w: number; h: number; deg: number; drawnCard: UnoCard | null } | null>(null);
    const [hidingLastCard, setHidingLastCard] = useState(false);
    const flyCardTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const playFlyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const [playFlyCard, setPlayFlyCard] = useState<{ fromX: number; fromY: number; toX: number; toY: number; card: UnoCard } | null>(null);
    // opponent draw fly per playerNumber
    const [oppFlyCard, setOppFlyCard] = useState<{ fromX: number; fromY: number; toX: number; toY: number; deg: number } | null>(null);
    const [oppPlayFlyCard, setOppPlayFlyCard] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
    const oppPlayQueue = useRef<{ player: number; seq: number }[]>([]);
    const oppPlayRunning = useRef(false);
    const [discardPopKey, setDiscardPopKey] = useState(0);
    const drawPileRef = useRef<HTMLDivElement>(null);
    const discardRef = useRef<HTMLDivElement>(null);
    const handRef = useRef<HTMLDivElement>(null);
    const lastPlayerCardRef = useRef<HTMLDivElement>(null);
    const opponentLastCardRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const { ownHand, opponentHandSizes, discardPileTop, discardPileRecent, drawPileCount, currentColor, currentTurn, drewThisTurn } = unoState;

    // Kad ownHand se ažurira dok flyCard je aktivan, snimi novu zadnju kartu za flip reveal
    useEffect(() => {
        if (!flyCard || flyCard.drawnCard !== null) return;
        const newCard = ownHand[ownHand.length - 1] ?? null;
        if (newCard) {
            setFlyCard(prev => prev ? { ...prev, drawnCard: newCard } : null);
        }
    // flyCard namjerno nije u deps — čitamo ga samo kao guard, ne želimo re-run kad se flyCard promijeni
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ownHand]);

    // Trigger opponent draw animation
    useEffect(() => {
        if (opponentDrawAnim == null) return;
        const { player } = opponentDrawAnim;
        const from = drawPileRef.current?.getBoundingClientRect();
        const to = opponentLastCardRefs.current[player]?.getBoundingClientRect();
        if (from && to) {
            const count = opponentHandSizes[player] ?? 1;
            const visible = Math.min(count, 12);
            const maxTilt = Math.min(visible * 6, 50);
            const deg = 180 + (-0.5 * maxTilt * 2);
            setOppFlyCard({
                fromX: from.left + from.width / 2,
                fromY: from.top + from.height / 2,
                toX: to.left + to.width / 2,
                toY: to.top + to.height / 2,
                deg,
            });
            const t = setTimeout(() => setOppFlyCard(null), 750);
            return () => clearTimeout(t);
        }
    }, [opponentDrawAnim]);

    const runNextOppPlay = useRef<() => void>(null as unknown as () => void);
    runNextOppPlay.current = () => {
        const next = oppPlayQueue.current.shift();
        if (!next) { oppPlayRunning.current = false; return; }
        oppPlayRunning.current = true;
        const from = opponentLastCardRefs.current[next.player]?.getBoundingClientRect();
        const to = discardRef.current?.getBoundingClientRect();
        if (from && to) {
            setOppPlayFlyCard({
                fromX: from.left + from.width / 2,
                fromY: from.top + from.height / 2,
                toX: to.left + to.width / 2,
                toY: to.top + to.height / 2,
            });
            setTimeout(() => setDiscardPopKey(k => k + 1), 480);
            setTimeout(() => {
                setOppPlayFlyCard(null);
                runNextOppPlay.current();
            }, 680);
        } else {
            runNextOppPlay.current();
        }
    };

    // Trigger opponent play animation — queue so rapid plays don't skip
    useEffect(() => {
        if (opponentPlayAnim == null) return;
        oppPlayQueue.current.push(opponentPlayAnim);
        if (!oppPlayRunning.current) runNextOppPlay.current();
    }, [opponentPlayAnim]);



    const handleDraw = () => {
        if (!isYourTurn || disabled || drewThisTurn || flyCard) return;
        const from = drawPileRef.current?.getBoundingClientRect();
        const to = (lastPlayerCardRef.current ?? handRef.current)?.getBoundingClientRect();
        if (from && to) {
            const newCount = ownHand.length + 1;
            const W = newCount > 9 ? Math.max(84, Math.round(116 * (9 / newCount))) : 116;
            const H = Math.round(W * 1.5);
            const maxSpreadDeg = Math.min(newCount * 9, 130);
            const startDeg = -maxSpreadDeg / 2;
            const stepDeg = newCount > 1 ? maxSpreadDeg / (newCount - 1) : 0;
            const deg = (startDeg + (newCount - 1) * stepDeg) * 0.5;
            setHidingLastCard(true);
            // drawnCard se popunjava naknadno kad HTTP response ažurira ownHand
            setFlyCard({
                fromX: from.left + from.width / 2,
                fromY: from.top + from.height / 2,
                toX: to.left + to.width / 2,
                toY: to.top + to.height / 2,
                w: W, h: H, deg, drawnCard: null,
            });
            flyCardTimers.current.forEach(clearTimeout);
            flyCardTimers.current = [
                setTimeout(() => setHidingLastCard(false), 1230),
                setTimeout(() => setFlyCard(null), 1450),
            ];
        }
        onDraw();
    };

    const isPlayable = (card: UnoCard, cardIdx?: number): boolean => {
        if (!isYourTurn || disabled) return false;
        if (card.type === 'wild') return true;
        if (card.type === 'wild_draw_four') {
            return !ownHand.some((c, i) => i !== cardIdx && c.color === currentColor);
        }
        if (card.color === currentColor) return true;
        if (card.type === 'number' && discardPileTop?.type === 'number' && card.value === discardPileTop.value) return true;
        if (card.type !== 'number' && discardPileTop && card.type === discardPileTop.type) return true;
        return false;
    };

    const handleCardClick = (idx: number) => {
        if (!isYourTurn || disabled) return;
        const card = ownHand[idx];
        if (!isPlayable(card, idx)) return;

        if (card.type === 'wild' || card.type === 'wild_draw_four') {
            setWildPendingIdx(idx);
            setSelectedIdx(idx);
            return;
        }

        if (selectedIdx === idx) {
            const from = handRef.current?.getBoundingClientRect();
            const to = discardRef.current?.getBoundingClientRect();
            if (from && to) {
                setPlayFlyCard({
                    fromX: from.left + from.width / 2,
                    fromY: from.top + from.height / 2,
                    toX: to.left + to.width / 2,
                    toY: to.top + to.height / 2,
                    card,
                });
                playFlyTimers.current.forEach(clearTimeout);
                playFlyTimers.current = [
                    setTimeout(() => setDiscardPopKey(k => k + 1), 375),
                    setTimeout(() => setPlayFlyCard(null), 520),
                ];
            }
            onPlayCard(idx);
            setSelectedIdx(null);
        } else {
            setSelectedIdx(idx);
        }
    };

    const handleWildColor = (color: string) => {
        if (wildPendingIdx === null) return;
        const card = ownHand[wildPendingIdx];
        const from = handRef.current?.getBoundingClientRect();
        const to = discardRef.current?.getBoundingClientRect();
        if (from && to) {
            setPlayFlyCard({
                fromX: from.left + from.width / 2,
                fromY: from.top + from.height / 2,
                toX: to.left + to.width / 2,
                toY: to.top + to.height / 2,
                card,
            });
            playFlyTimers.current.forEach(clearTimeout);
            playFlyTimers.current = [
                setTimeout(() => setDiscardPopKey(k => k + 1), 375),
                setTimeout(() => setPlayFlyCard(null), 520),
            ];
        }
        onPlayCard(wildPendingIdx, color);
        setWildPendingIdx(null);
        setSelectedIdx(null);
    };

    const opponents = Object.entries(opponentHandSizes).map(([num, count]) => ({
        playerNumber: Number(num),
        count,
        name: unoState.players[Number(num)] ?? `Igrač ${num}`,
    }));

    return (
        <>
        <style>{`
            @keyframes cardPulse {
                0%, 100% { box-shadow: 0 0 0 2px #fff176, 0 12px 32px rgba(0,0,0,0.55); }
                50%       { box-shadow: 0 0 0 6px rgba(255,241,118,0.4), 0 12px 32px rgba(0,0,0,0.55); }
            }
            @keyframes cardFlyToHand {
                0%   { transform: translate(var(--fly-x0), var(--fly-y0)) rotate(45deg) scale(1); opacity: 1; }
                40%  { transform: translate(calc(var(--fly-x0) * 0.5 + var(--fly-x1) * 0.5), calc(var(--fly-y0) * 0.7 + var(--fly-y1) * 0.3 - 60px)) rotate(20deg) scale(1.1); opacity: 1; }
                60%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(1); opacity: 1; }
                85%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(1); opacity: 1; }
                100% { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(1); opacity: 0; }
            }
            @keyframes cardFlyToOpponent {
                0%   { transform: translate(var(--fly-x0), var(--fly-y0)) rotate(-45deg) scale(1); opacity: 1; }
                40%  { transform: translate(calc(var(--fly-x0) * 0.5 + var(--fly-x1) * 0.5), calc(var(--fly-y0) * 0.7 + var(--fly-y1) * 0.3 - 50px)) rotate(90deg) scale(1.1); opacity: 1; }
                78%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(1); opacity: 1; }
                90%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(1); opacity: 1; }
                100% { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scale(0.85); opacity: 0; }
            }
            @keyframes cardFlyBack {
                0%   { transform: translate(var(--fly-x0), var(--fly-y0)) rotate(45deg) scaleX(1); opacity: 1; }
                25%  { transform: translate(var(--fly-x0), calc(var(--fly-y0) - 160px)) rotate(20deg) scaleX(1); opacity: 1; }
                55%  { transform: translate(var(--fly-x1), calc(var(--fly-y1) - 80px)) rotate(var(--fly-deg)) scaleX(1); opacity: 1; }
                65%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(1); opacity: 1; }
                72%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(0); opacity: 1; }
                100% { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(0); opacity: 0; }
            }
            @keyframes cardFlyFront {
                0%   { transform: translate(var(--fly-x0), var(--fly-y0)) rotate(45deg) scaleX(0); opacity: 0; }
                25%  { transform: translate(var(--fly-x0), calc(var(--fly-y0) - 160px)) rotate(20deg) scaleX(0); opacity: 0; }
                55%  { transform: translate(var(--fly-x1), calc(var(--fly-y1) - 80px)) rotate(var(--fly-deg)) scaleX(0); opacity: 0; }
                65%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(0); opacity: 0; }
                71%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(0); opacity: 1; }
                80%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(1); opacity: 1; }
                88%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(1); opacity: 1; }
                100% { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(var(--fly-deg)) scaleX(1); opacity: 0; }
            }
            @keyframes cardFlyToDiscard {
                0%   { transform: translate(var(--fly-x0), var(--fly-y0)) rotate(0deg) scale(1); opacity: 1; }
                40%  { transform: translate(calc(var(--fly-x0) * 0.4 + var(--fly-x1) * 0.6), calc(var(--fly-y0) * 0.4 + var(--fly-y1) * 0.6 - 55px)) rotate(-18deg) scale(1.1); opacity: 1; }
                85%  { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(-30deg) scale(1); opacity: 1; }
                100% { transform: translate(var(--fly-x1), var(--fly-y1)) rotate(-30deg) scale(1); opacity: 0; }
            }
            @keyframes discardPop {
                0%   { transform: rotate(-2deg) translateZ(2px) scale(0.72); opacity: 0.7; }
                60%  { transform: rotate(-2deg) translateZ(2px) scale(1.06); opacity: 1; }
                100% { transform: rotate(-2deg) translateZ(2px) scale(1); opacity: 1; }
            }
            @keyframes playerActivePulse {
                0%   { transform: scale(1); }
                45%  { transform: scale(1.18); }
                100% { transform: scale(1); }
            }
            @keyframes colorAppear {
                0%   { transform: scale(0.6) rotate(-25deg); opacity: 0.5; }
                65%  { transform: scale(1.08) rotate(3deg); opacity: 1; }
                100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>

            {/* Opponents */}
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 4 }}>
                {opponents.map(({ playerNumber: pn, count, name }) => (
                    <div key={pn}>
                        <OpponentFan
                            count={count}
                            name={name}
                            isActive={currentTurn === pn}
                            lastCardRef={el => { opponentLastCardRefs.current[pn] = el; }}
                        />
                    </div>
                ))}
            </div>

            {/* Center area: discard + draw + color */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 78,
                padding: '43px 72px',
            }}>

                {/* Discard pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        Odbačeno
                    </span>
                    <div style={{
                        position: 'relative', width: 140, height: 210,
                        transform: 'perspective(600px) rotateX(12deg) rotateY(-4deg) rotate(-30deg)',
                        transformStyle: 'preserve-3d',
                    }}>
                        {[
                            { rot: -11, x: -6, y: 5 },
                            { rot:   7, x:  5, y: 3 },
                            { rot:  -3, x: -1, y: 1 },
                        ].map((s, i) => {
                            const card = discardPileRecent[i];
                            return card ? (
                                <div key={i} style={{
                                    position: 'absolute', inset: 0, zIndex: i,
                                    transform: `rotate(${s.rot}deg) translate(${s.x}px, ${s.y}px) translateZ(${-8 * (3 - i)}px)`,
                                    pointerEvents: 'none',
                                }}>
                                    <CardFace card={card} w={140} h={210} />
                                </div>
                            ) : (
                                <div key={i} style={{
                                    position: 'absolute', inset: 0, borderRadius: 12,
                                    background: 'rgba(0,0,0,0.14)',
                                    border: '1.5px solid rgba(255,255,255,0.06)',
                                    transform: `rotate(${s.rot}deg) translate(${s.x}px, ${s.y}px) translateZ(${-8 * (3 - i)}px)`,
                                    zIndex: i,
                                }} />
                            );
                        })}
                        {/* Top card — ref here for fly-to-discard target, key triggers discardPop */}
                        <div
                            ref={discardRef}
                            style={{ position: 'absolute', inset: 0, zIndex: 4 }}
                        >
                            {discardPileTop
                                ? (
                                    <div
                                        key={discardPopKey}
                                        style={{ animation: 'discardPop 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
                                    >
                                        <CardFace card={discardPileTop} w={140} h={210} />
                                    </div>
                                )
                                : <div style={{ width: 140, height: 210, borderRadius: 12, border: '2px dashed rgba(255,255,255,0.15)' }} />
                            }
                        </div>
                    </div>
                </div>

                {/* Current color indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{
                        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                        color: COLOR_BG[currentColor] ?? '#94a3b8',
                        textShadow: `0 0 8px ${COLOR_BG[currentColor] ?? '#888'}80`,
                    }}>
                        Boja
                    </span>
                    <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {currentColor !== 'wild'
                            ? <img
                                key={currentColor}
                                src={`/images/UNO_cards/uno_title_colors/UNO_COLOR_${currentColor}.svg`}
                                width={120}
                                height={120}
                                style={{ display: 'block', animation: 'colorAppear 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
                                draggable={false}
                            />
                            : <div
                                key={currentColor}
                                style={{
                                    width: 90, height: 90, borderRadius: '50%',
                                    background: 'conic-gradient(#e53935 0deg 90deg, #43a047 90deg 180deg, #1e88e5 180deg 270deg, #fdd835 270deg 360deg)',
                                    animation: 'colorAppear 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards',
                                }}
                            />
                        }
                    </div>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {COLOR_LABEL[currentColor] ?? '—'}
                    </span>
                </div>

                {/* Draw pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        Špil ({drawPileCount})
                    </span>
                    {/* Wrapper — ne rotira se, samo pozicionira */}
                    <div style={{ position: 'relative', width: 112, height: 164, transform: 'rotate(45deg)' }}>
                        {/* Statične karte ispod — ne miču se */}
                        {[2, 1].map(i => (
                            <div key={i} style={{
                                position: 'absolute',
                                top: i * 2, left: i * 1.5,
                                width: 105, height: 157,
                                borderRadius: 10,
                                background: 'radial-gradient(ellipse at 30% 30%, #1a3a6e 0%, #0d1b35 100%)',
                                border: '1.5px solid rgba(255,255,255,0.09)',
                            }} />
                        ))}
                        {/* Top karta — jedina se hover-ira i iz nje leti animacija */}
                        <div
                            ref={drawPileRef}
                            onClick={handleDraw}
                            style={{
                                position: 'absolute', top: 0, left: 0,
                                zIndex: 3,
                                cursor: isYourTurn && !disabled && !drewThisTurn ? 'pointer' : 'default',
                                transition: 'transform 0.2s ease',
                            }}
                            onMouseEnter={e => { if (isYourTurn && !disabled && !drewThisTurn) (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                        >
                            <CardBack w={105} h={157} />
                            {isYourTurn && !disabled && !drewThisTurn && (
                                <div style={{
                                    position: 'absolute', inset: 0, zIndex: 4, borderRadius: 8,
                                    boxShadow: '0 0 0 2px #fff176, 0 0 14px rgba(255,241,118,0.4)',
                                    pointerEvents: 'none',
                                }} />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Player's hand label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -50 }}>
                <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: isYourTurn ? '#fbbf24' : '#94a3b8',
                    textShadow: isYourTurn ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
                }}>Tvoje karte</span>
                <span style={{
                    fontSize: 12, fontWeight: 700,
                    background: 'transparent',
                    border: `1.5px solid ${isYourTurn ? '#fbbf24' : '#94a3b8'}`,
                    borderRadius: 100,
                    width: 28, height: 28,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: isYourTurn ? '#fbbf24' : '#94a3b8',
                }}>{ownHand.length}</span>
            </div>

            {/* Draw animation — poleđina leti do ruke, pa flip reveal */}
            {flyCard && (() => {
                const { w, h, deg, drawnCard } = flyCard;
                const dx = flyCard.toX - flyCard.fromX;
                const dy = flyCard.toY - flyCard.fromY;
                return (
                    <div style={{
                        position: 'fixed',
                        left: flyCard.fromX - w / 2,
                        top: flyCard.fromY - h / 2,
                        width: w, height: h,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        ['--fly-x0' as string]: '0px',
                        ['--fly-y0' as string]: '0px',
                        ['--fly-x1' as string]: `${dx}px`,
                        ['--fly-y1' as string]: `${dy}px`,
                        ['--fly-deg' as string]: `${deg}deg`,
                    }}>
                        {/* poleđina leti, na odredištu se scaleX→0 (flip out) */}
                        <div style={{ position: 'absolute', inset: 0, animation: 'cardFlyBack 1.4s ease-in-out forwards', transformOrigin: 'center' }}>
                            <CardBack w={w} h={h} />
                        </div>
                        {/* lice čeka na odredištu, pa scaleX 0→1 (flip in), pa nestaje */}
                        {drawnCard && (
                            <div style={{ position: 'absolute', inset: 0, animation: 'cardFlyFront 1.4s ease-in-out forwards', transformOrigin: 'center' }}>
                                <CardFace card={drawnCard} w={w} h={h} />
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Opponent draw animation — poleđina leti prema protivniku */}
            {oppFlyCard && (() => {
                const dx = oppFlyCard.toX - oppFlyCard.fromX;
                const dy = oppFlyCard.toY - oppFlyCard.fromY;
                return (
                    <div style={{
                        position: 'fixed',
                        left: oppFlyCard.fromX - 40,
                        top: oppFlyCard.fromY - 60,
                        width: 80, height: 120,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        animation: 'cardFlyToOpponent 0.65s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
                        ['--fly-x0' as string]: '0px',
                        ['--fly-y0' as string]: '0px',
                        ['--fly-x1' as string]: `${dx}px`,
                        ['--fly-y1' as string]: `${dy}px`,
                        ['--fly-deg' as string]: `${oppFlyCard.deg}deg`,
                    }}>
                        <CardBack w={80} h={120} />
                    </div>
                );
            })()}

            {/* Play animation — card flies from hand to discard pile */}
            {playFlyCard && (() => {
                const dx = playFlyCard.toX - playFlyCard.fromX;
                const dy = playFlyCard.toY - playFlyCard.fromY;
                return (
                    <div style={{
                        position: 'fixed',
                        left: playFlyCard.fromX - 70,
                        top: playFlyCard.fromY - 105,
                        width: 140, height: 210,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        animation: 'cardFlyToDiscard 0.5s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
                        ['--fly-x0' as string]: '0px',
                        ['--fly-y0' as string]: '0px',
                        ['--fly-x1' as string]: `${dx}px`,
                        ['--fly-y1' as string]: `${dy}px`,
                    }}>
                        <CardFace card={playFlyCard.card} w={140} h={210} />
                    </div>
                );
            })()}

            {/* Opponent play animation — karta leti s fana na discard, iste vel i rotacije kao discard */}
            {oppPlayFlyCard && (() => {
                const dx = oppPlayFlyCard.toX - oppPlayFlyCard.fromX;
                const dy = oppPlayFlyCard.toY - oppPlayFlyCard.fromY;
                return (
                    <div style={{
                        position: 'fixed',
                        left: oppPlayFlyCard.fromX - 70,
                        top: oppPlayFlyCard.fromY - 105,
                        width: 140, height: 210,
                        zIndex: 9999,
                        pointerEvents: 'none',
                        animation: 'cardFlyToDiscard 0.6s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
                        ['--fly-x0' as string]: '0px',
                        ['--fly-y0' as string]: '0px',
                        ['--fly-x1' as string]: `${dx}px`,
                        ['--fly-y1' as string]: `${dy}px`,
                    }}>
                        <CardBack w={140} h={210} />
                    </div>
                );
            })()}

            {/* Player fan */}
            <div ref={handRef}>
                <PlayerFan
                    hand={ownHand}
                    selectedIdx={selectedIdx}
                    wildPendingIdx={wildPendingIdx}
                    isYourTurn={isYourTurn}
                    disabled={disabled}
                    isPlayable={isPlayable}
                    onCardClick={handleCardClick}
                    onWildColor={handleWildColor}
                    lastCardRef={lastPlayerCardRef}
                    hideLastCard={hidingLastCard}
                />
            </div>
        </div>
        </>
    );
}