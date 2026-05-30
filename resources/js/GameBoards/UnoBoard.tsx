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

const COLOR_TEXT: Record<string, string> = {
    red: 'white',
    green: 'white',
    blue: 'white',
    yellow: '#1a1a1a',
    wild: 'white',
};

function cardLabel(card: UnoCard): string {
    switch (card.type) {
        case 'number': return String(card.value);
        case 'skip': return '🚫';
        case 'reverse': return '🔄';
        case 'draw_two': return '+2';
        case 'wild': return '★';
        case 'wild_draw_four': return '+4';
        default: return '?';
    }
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
    const textColor = COLOR_TEXT[card.color] ?? 'white';
    const isWild = card.color === 'wild';
    const font = Math.round(h * 0.28);

    const lift = selected ? -24 : playable ? -10 : 0;

    return (
        <div
            onClick={onClick}
            style={{
                width: w,
                height: h,
                borderRadius: Math.round(w * 0.13),
                background: isWild
                    ? 'conic-gradient(#e53935 0deg 90deg, #43a047 90deg 180deg, #1e88e5 180deg 270deg, #fdd835 270deg 360deg)'
                    : bg,
                border: selected
                    ? `2px solid ${bg}`
                    : '2px solid rgba(255,255,255,0.3)',
                boxShadow: selected
                    ? `0 0 0 2px ${bg}, 0 0 16px ${bg}80, 0 12px 32px rgba(0,0,0,0.55)`
                    : playable
                      ? '0 0 0 2px rgba(255,255,255,0.55), 0 8px 20px rgba(0,0,0,0.4)'
                      : '0 4px 10px rgba(0,0,0,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: onClick ? 'pointer' : 'default',
                transform: `rotate(${rotation}deg) translateY(${lift}px) scale(${selected ? 1.12 : 1})`,
                transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s',
                animation: selected ? 'cardPulse 1.2s ease-in-out infinite' : 'none',
                userSelect: 'none',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                ...extraStyle,
            }}
        >
            {/* Inner oval outline */}
            <div style={{
                position: 'absolute',
                width: '68%',
                height: '82%',
                borderRadius: '40%',
                border: '2px solid rgba(255,255,255,0.22)',
                transform: 'rotate(-10deg)',
            }} />
            {/* Corner TL */}
            <span style={{
                position: 'absolute', top: 6, left: 7,
                fontSize: Math.round(font * 0.52), fontWeight: 900,
                color: textColor, lineHeight: 1, opacity: 0.9,
            }}>{cardLabel(card)}</span>
            {/* Center */}
            <span style={{
                fontSize: font, fontWeight: 900, color: textColor,
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                position: 'relative', zIndex: 1, letterSpacing: -1,
            }}>{cardLabel(card)}</span>
            {/* Corner BR */}
            <span style={{
                position: 'absolute', bottom: 6, right: 7,
                fontSize: Math.round(font * 0.52), fontWeight: 900,
                color: textColor, lineHeight: 1, opacity: 0.9,
                transform: 'rotate(180deg)',
            }}>{cardLabel(card)}</span>
        </div>
    );
}

function CardBack({ w = 54, h = 80, rotation = 0 }: { w?: number; h?: number; rotation?: number }) {
    return (
        <div style={{
            width: w,
            height: h,
            borderRadius: Math.round(w * 0.12),
            background: 'radial-gradient(ellipse at 30% 30%, #1a3a6e 0%, #0d1b35 100%)',
            border: '2px solid rgba(255,255,255,0.14)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: `rotate(${rotation}deg)`,
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute', inset: 5,
                borderRadius: Math.round(w * 0.08),
                border: '1.5px solid rgba(255,255,255,0.07)',
            }} />
            <span style={{
                fontSize: w * 0.3, color: 'rgba(255,255,255,0.18)',
                fontWeight: 900, fontStyle: 'italic', letterSpacing: -1,
            }}>UNO</span>
        </div>
    );
}

/** Fan of opponent's card backs — cards face inward (rotated 180°), arc opens upward */
function OpponentFan({ count, name, isActive }: { count: number; name: string; isActive: boolean }) {
    const visible = Math.min(count, 12);
    const W = 60;
    const H = 90;
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
                    fontSize: 11,
                    background: isActive ? 'rgba(251,191,36,0.15)' : '#1e293b',
                    border: `1px solid ${isActive ? '#fbbf24' : '#334155'}`,
                    borderRadius: 100, padding: '1px 7px',
                    color: isActive ? '#fbbf24' : '#64748b', fontWeight: 700,
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
    isYourTurn,
    disabled,
    isPlayable,
    onCardClick,
}: {
    hand: UnoCard[];
    selectedIdx: number | null;
    isYourTurn: boolean;
    disabled: boolean;
    isPlayable: (card: UnoCard, idx?: number) => boolean;
    onCardClick: (idx: number) => void;
}) {
    const count = hand.length;
    if (count === 0) return <span style={{ color: '#64748b', fontSize: 14 }}>Nema karata!</span>;

    const W = count > 9 ? Math.max(70, Math.round(96 * (9 / count))) : 96;
    const H = Math.round(W * 1.5);
    const maxSpreadDeg = Math.min(count * 9, 130);
    const startDeg = -maxSpreadDeg / 2;
    const stepDeg = count > 1 ? maxSpreadDeg / (count - 1) : 0;
    const spacing = Math.min(W * 0.62, 560 / Math.max(count, 1));
    const totalW = count > 1 ? (count - 1) * spacing + W : W;
    const containerW = totalW + 80;
    const containerH = H + 90;

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: containerW, height: containerH }}>
                {hand.map((card, idx) => {
                    const t = count > 1 ? idx / (count - 1) - 0.5 : 0;
                    const xPx = t * (count - 1) * spacing;
                    const yPx = (t * t) * 30; // edges dip down
                    const deg = startDeg + idx * stepDeg;
                    const playable = isPlayable(card, idx);
                    const selected = selectedIdx === idx;

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
    onPass,
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

    const handleConfirmPlay = () => {
        if (selectedIdx === null) return;
        const card = ownHand[selectedIdx];
        if (card.type === 'wild' || card.type === 'wild_draw_four') return;
        onPlayCard(selectedIdx);
        setSelectedIdx(null);
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>

            {/* Wild color picker modal */}
            {wildPendingIdx !== null && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }} onClick={() => { setWildPendingIdx(null); setSelectedIdx(null); }}>
                    <div style={{
                        background: '#1e293b', borderRadius: 20, padding: '28px 36px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, textAlign: 'center', color: 'white' }}>
                            Odaberi boju
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {Object.entries(COLOR_LABEL).map(([color, label]) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => handleWildColor(color)}
                                    style={{
                                        background: COLOR_BG[color],
                                        border: 'none',
                                        borderRadius: 12,
                                        padding: '18px 28px',
                                        color: COLOR_TEXT[color],
                                        fontWeight: 800,
                                        fontSize: 16,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        transition: 'transform 0.1s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
                gap: 32,
                padding: '20px 32px',
                background: 'rgba(0,0,0,0.07)',
                borderRadius: 24,
                border: '1px solid rgba(255,255,255,0.08)',
            }}>

                {/* Discard pile with scattered cards underneath */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Odbačeno
                    </span>
                    <div style={{
                        position: 'relative', width: 96, height: 144,
                        transform: 'perspective(600px) rotateX(12deg) rotateY(-4deg)',
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
                                    <CardFace card={card} w={96} h={144} />
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
                                ? <CardFace card={discardPileTop} w={96} h={144} />
                                : <div style={{ width: 96, height: 144, borderRadius: 10, border: '2px dashed rgba(255,255,255,0.15)' }} />
                            }
                        </div>
                    </div>
                </div>

                {/* Current color dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Boja
                    </span>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: currentColor === 'wild'
                            ? 'conic-gradient(#e53935 0deg 90deg, #43a047 90deg 180deg, #1e88e5 180deg 270deg, #fdd835 270deg 360deg)'
                            : COLOR_BG[currentColor] ?? '#212121',
                        boxShadow: `0 0 0 3px rgba(255,255,255,0.12), 0 0 20px ${COLOR_BG[currentColor] ?? '#888'}60`,
                    }} />
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                        {COLOR_LABEL[currentColor] ?? '—'}
                    </span>
                </div>

                {/* Draw pile */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Špil ({drawPileCount})
                    </span>
                    <div
                        onClick={() => { if (isYourTurn && !disabled && !drewThisTurn) onDraw(); }}
                        style={{
                            position: 'relative',
                            cursor: isYourTurn && !disabled && !drewThisTurn ? 'pointer' : 'default',
                            transition: 'transform 0.15s',
                        }}
                        onMouseEnter={e => { if (isYourTurn && !disabled && !drewThisTurn) (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                    >
                        {[2, 1].map(i => (
                            <div key={i} style={{
                                position: 'absolute',
                                top: i * 2, left: i * 1.5,
                                width: 54, height: 80,
                                borderRadius: 7,
                                background: 'radial-gradient(ellipse at 30% 30%, #1a3a6e 0%, #0d1b35 100%)',
                                border: '1.5px solid rgba(255,255,255,0.09)',
                            }} />
                        ))}
                        <div style={{ position: 'relative', zIndex: 3 }}>
                            <CardBack w={54} h={80} />
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

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', minHeight: 40 }}>
                {isYourTurn && !disabled && drewThisTurn && (
                    <button
                        type="button"
                        onClick={onPass}
                        style={{
                            borderRadius: 100,
                            border: '1.5px solid rgba(255,255,255,0.2)',
                            background: 'rgba(255,255,255,0.08)',
                            padding: '9px 22px',
                            fontSize: 13, fontWeight: 600, color: '#cbd5e1',
                            cursor: 'pointer',
                        }}
                    >
                        Pas — završi potez
                    </button>
                )}
                {selectedIdx !== null && ownHand[selectedIdx] && (() => {
                    const card = ownHand[selectedIdx];
                    if (card.type === 'wild' || card.type === 'wild_draw_four') return null;
                    return (
                        <button
                            type="button"
                            onClick={handleConfirmPlay}
                            style={{
                                borderRadius: 100,
                                background: '#0f172a',
                                border: 'none',
                                padding: '10px 30px',
                                fontSize: 15, fontWeight: 800, color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
                            }}
                        >
                            Odigraj ▶
                        </button>
                    );
                })()}
            </div>

            {/* Player's hand label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: -12 }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Tvoje karte</span>
                <span style={{
                    fontSize: 12, background: '#1e293b', borderRadius: 100,
                    padding: '2px 9px', color: '#94a3b8', fontWeight: 700,
                }}>{ownHand.length}</span>
                {isYourTurn && !disabled && (
                    <span style={{
                        fontSize: 11, color: '#fbbf24', fontWeight: 700,
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.3)',
                        borderRadius: 100, padding: '2px 9px',
                    }}>Tvoj red!</span>
                )}
            </div>

            {/* Player fan */}
            <PlayerFan
                hand={ownHand}
                selectedIdx={selectedIdx}
                isYourTurn={isYourTurn}
                disabled={disabled}
                isPlayable={isPlayable}
                onCardClick={handleCardClick}
            />
        </div>
        </>
    );
}