import { useState } from 'react';

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
function OpponentFan({ count, name, isActive }: { count: number; name: string; isActive: boolean }) {
    const visible = Math.min(count, 12);
    const W = 80;
    const H = 120;
    // Each card is offset enough so its edge is clearly visible
    const spacing = Math.min(36, 440 / Math.max(visible, 1));
    const totalW = visible > 1 ? (visible - 1) * spacing + W : W;
    const containerW = totalW + 60;
    // Max tilt angle for the outermost card
    const maxTilt = Math.min(visible * 6, 50);
    // Arc: middle card at top (y=0), edge cards dip down
    const arcDepth = 28;
    const containerH = H + arcDepth + 8;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {/* Name + count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isActive ? '#fbbf24' : '#94a3b8',
                    textShadow: isActive ? '0 0 8px rgba(251,191,36,0.5)' : 'none',
                }}>{name}</span>
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
                    // t goes -0.5 (leftmost) to +0.5 (rightmost)
                    const t = visible > 1 ? i / (visible - 1) - 0.5 : 0;
                    // X: evenly spaced
                    const xPx = t * (visible - 1) * spacing;
                    // Y: inverted parabola — edges at y=0 (top), middle dips down
                    const yPx = (0.25 - t * t) * arcDepth * 4;
                    // Tilt: left cards lean left, right cards lean right
                    // Then add 180° so cards face inward (toward center of table)
                    const tilt = -t * maxTilt * 2;
                    return (
                        <div key={i} style={{
                            position: 'absolute',
                            left: '50%',
                            top: yPx,
                            zIndex: i,
                            transform: `translateX(calc(-50% + ${xPx}px)) rotate(${180 + tilt}deg)`,
                            transformOrigin: 'center center',
                        }}>
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
}: {
    hand: UnoCard[];
    selectedIdx: number | null;
    wildPendingIdx: number | null;
    isYourTurn: boolean;
    disabled: boolean;
    isPlayable: (card: UnoCard, idx?: number) => boolean;
    onCardClick: (idx: number) => void;
    onWildColor: (color: string) => void;
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
    const containerH = H + 180; // extra room for color picker above

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

                    return (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                bottom: 0,
                                transform: `translateX(calc(-50% + ${xPx}px)) translateY(${yPx}px)`,
                                zIndex: selected ? 200 : idx,
                                opacity: !isYourTurn || disabled ? 0.75 : playable ? 1 : 0.4,
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
                            {/* Color picker — same fan logic as main hand, above wild card */}
                            {isWildPending && (
                                <div style={{ position: 'absolute', bottom: H + 48, left: '50%', transform: 'translateX(calc(-50% + 55px))', zIndex: 300, width: containerW, pointerEvents: 'none' }}>
                                    <div style={{ position: 'relative', width: containerW, height: H + 60, pointerEvents: 'auto' }}>
                                        {Object.keys(COLOR_LABEL).map((color, ci) => {
                                            // Position each color card as if it were at idx position in the full hand fan
                                            // Center them around the wild card's position (idx)
                                            const offset = ci - 1.5; // -1.5, -0.5, +0.5, +1.5
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
}: UnoBoardProps) {
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [wildPendingIdx, setWildPendingIdx] = useState<number | null>(null);

    const { ownHand, opponentHandSizes, discardPileTop, discardPileRecent, drawPileCount, currentColor, currentTurn, drewThisTurn } = unoState;

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
            onPlayCard(idx);
            setSelectedIdx(null);
        } else {
            setSelectedIdx(idx);
        }
    };

const handleWildColor = (color: string) => {
        if (wildPendingIdx === null) return;
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
        `}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>

            {/* Opponents */}
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 4 }}>
                {opponents.map(({ playerNumber: pn, count, name }) => (
                    <OpponentFan key={pn} count={count} name={name} isActive={currentTurn === pn} />
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

                {/* Discard pile with scattered cards underneath */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        Odbačeno
                    </span>
                    <div style={{
                        position: 'relative', width: 120, height: 180,
                        transform: 'perspective(600px) rotateX(12deg) rotateY(-4deg) rotate(-30deg)',
                        transformStyle: 'preserve-3d',
                    }}>
                        {/* Previous cards in pile — show real cards, offset behind top */}
                        {[
                            { rot: -11, x: -6, y: 5 },
                            { rot:   7, x:  5, y: 3 },
                            { rot:  -3, x: -1, y: 1 },
                        ].map((s, i) => {
                            // discardPileRecent = [oldest, ..., newest] — show from bottom up
                            // i=0 is the furthest back, i=2 is just below top
                            const card = discardPileRecent[i];
                            return card ? (
                                <div key={i} style={{
                                    position: 'absolute', inset: 0, zIndex: i,
                                    transform: `rotate(${s.rot}deg) translate(${s.x}px, ${s.y}px) translateZ(${-8 * (3 - i)}px)`,
                                    pointerEvents: 'none',
                                }}>
                                    <CardFace card={card} w={120} h={180} />
                                </div>
                            ) : (
                                <div key={i} style={{
                                    position: 'absolute', inset: 0, borderRadius: 10,
                                    background: 'rgba(0,0,0,0.14)',
                                    border: '1.5px solid rgba(255,255,255,0.06)',
                                    transform: `rotate(${s.rot}deg) translate(${s.x}px, ${s.y}px) translateZ(${-8 * (3 - i)}px)`,
                                    zIndex: i,
                                }} />
                            );
                        })}
                        {/* Top card */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 4, transform: 'rotate(-2deg) translateZ(2px)' }}>
                            {discardPileTop
                                ? <CardFace card={discardPileTop} w={120} h={180} />
                                : <div style={{ width: 120, height: 180, borderRadius: 10, border: '2px dashed rgba(255,255,255,0.15)' }} />
                            }
                        </div>
                    </div>
                </div>

                {/* Current color — UNO color title SVG */}
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
                                src={`/images/UNO_cards/uno_title_colors/UNO_COLOR_${currentColor}.svg`}
                                width={120}
                                height={120}
                                style={{ display: 'block' }}
                                draggable={false}
                            />
                            : <div style={{
                                width: 90, height: 90, borderRadius: '50%',
                                background: 'conic-gradient(#e53935 0deg 90deg, #43a047 90deg 180deg, #1e88e5 180deg 270deg, #fdd835 270deg 360deg)',
                            }} />
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
                    <div
                        onClick={() => { if (isYourTurn && !disabled && !drewThisTurn) onDraw(); }}
                        style={{
                            position: 'relative',
                            cursor: isYourTurn && !disabled && !drewThisTurn ? 'pointer' : 'default',
                            transition: 'transform 0.15s',
                            transform: 'rotate(45deg)',
                        }}
                        onMouseEnter={e => { if (isYourTurn && !disabled && !drewThisTurn) (e.currentTarget as HTMLElement).style.transform = 'rotate(45deg) translateY(-6px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'rotate(45deg)'; }}
                    >
                        {[2, 1].map(i => (
                            <div key={i} style={{
                                position: 'absolute',
                                top: i * 2, left: i * 1.5,
                                width: 90, height: 135,
                                borderRadius: 9,
                                background: 'radial-gradient(ellipse at 30% 30%, #1a3a6e 0%, #0d1b35 100%)',
                                border: '1.5px solid rgba(255,255,255,0.09)',
                            }} />
                        ))}
                        <div style={{ position: 'relative', zIndex: 3 }}>
                            <CardBack w={90} h={135} />
                        </div>
                        {isYourTurn && !disabled && !drewThisTurn && (
                            <div style={{
                                position: 'absolute', inset: 0, zIndex: 4, borderRadius: 7,
                                boxShadow: '0 0 0 2px #fff176, 0 0 14px rgba(255,241,118,0.4)',
                                pointerEvents: 'none',
                            }} />
                        )}
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

            {/* Player fan */}
            <PlayerFan
                hand={ownHand}
                selectedIdx={selectedIdx}
                wildPendingIdx={wildPendingIdx}
                isYourTurn={isYourTurn}
                disabled={disabled}
                isPlayable={isPlayable}
                onCardClick={handleCardClick}
                onWildColor={handleWildColor}
            />
        </div>
        </>
    );
}