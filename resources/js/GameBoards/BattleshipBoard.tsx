import { useLayoutEffect, useRef, useState } from 'react';

export type Cell = { row: number; col: number };
export type Attack = { row: number; col: number; hit: boolean };
export type FleetEntry = { name: string; size: number; sunk: boolean };
export type Ship = { name: string; cells: Cell[] };

export type BoardView = {
    attacks: Attack[];
    ready: boolean;
    placedCount: number;
    fleet: FleetEntry[];
    sunkCells: Cell[];
    ships?: Ship[];
};

export type BattleshipState = {
    phase: 'placement' | 'attack';
    currentTurn: number;
    forfeited: number[];
    players: Record<number, string>;
    boards: Record<number, BoardView>;
};

export type Missile = { row: number; col: number; hit: boolean; seq: number };

export const GRID_SIZE = 10;

export const FLEET: { name: string; size: number; label: string }[] = [
    { name: 'carrier', size: 5, label: 'Nosač' },
    { name: 'battleship', size: 4, label: 'Bojni brod' },
    { name: 'cruiser', size: 3, label: 'Krstarica' },
    { name: 'submarine', size: 3, label: 'Podmornica' },
    { name: 'destroyer', size: 2, label: 'Razarač' },
];

// Placeholder colors — swap for ship SVGs later.
export const SHIP_COLORS: Record<string, string> = {
    carrier: '#6366f1',
    battleship: '#0ea5e9',
    cruiser: '#10b981',
    submarine: '#f59e0b',
    destroyer: '#ef4444',
};

const COL_LABELS = 'ABCDEFGHIJ'.split('');
const CELL = 34;
const MISSILE_W = 48;
const MISSILE_H = 16;
const FLIGHT_MS = 600;
const IMPACT_MS = 480;

const key = (row: number, col: number) => `${row},${col}`;

type Props = {
    /** Ship squares to render (only ever your own ships). */
    ships?: Ship[];
    /** Hit/miss markers landed on this board. */
    attacks?: Attack[];
    /** Cells belonging to sunk ships — revealed even when ships are hidden. */
    sunkCells?: Cell[];
    /** Preview cells while placing a ship (valid vs invalid tint). */
    previewCells?: Cell[];
    previewValid?: boolean;
    interactive?: boolean;
    /** Incoming missile to animate; bump `seq` to retrigger. */
    missile?: Missile | null;
    /** Cell key whose marker is hidden until the missile lands. */
    pendingCell?: string | null;
    onMissileComplete?: () => void;
    onCellClick?: (row: number, col: number) => void;
    onCellHover?: (row: number, col: number) => void;
    onCellLeave?: () => void;
};

export default function BattleshipBoard({
    ships = [],
    attacks = [],
    sunkCells = [],
    previewCells = [],
    previewValid = true,
    interactive = false,
    missile = null,
    pendingCell = null,
    onMissileComplete,
    onCellClick,
    onCellHover,
    onCellLeave,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const missileRef = useRef<HTMLDivElement>(null);
    const [impact, setImpact] = useState<{ x: number; y: number; hit: boolean } | null>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const el = missileRef.current;
        if (!missile || !container || !el) return;

        const cell = container.querySelector<HTMLElement>(`[data-cell="${missile.row},${missile.col}"]`);
        if (!cell) {
            onMissileComplete?.();
            return;
        }

        const cRect = container.getBoundingClientRect();
        const tRect = cell.getBoundingClientRect();
        const toX = tRect.left - cRect.left + tRect.width / 2;
        const toY = tRect.top - cRect.top + tRect.height / 2;

        // Random origin somewhere off the board.
        const angle = Math.random() * Math.PI * 2;
        const distance = 380;
        const fromX = toX + Math.cos(angle) * distance;
        const fromY = toY + Math.sin(angle) * distance;
        const heading = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;

        const place = (x: number, y: number) => `translate(${x - MISSILE_W / 2}px, ${y - MISSILE_H / 2}px) rotate(${heading}deg)`;

        el.style.opacity = '1';
        const flight = el.animate(
            [{ transform: place(fromX, fromY) }, { transform: place(toX, toY) }],
            { duration: FLIGHT_MS, easing: 'cubic-bezier(.45,.05,.55,1)', fill: 'forwards' },
        );

        let impactTimer: number | undefined;
        flight.onfinish = () => {
            el.style.opacity = '0';
            setImpact({ x: toX, y: toY, hit: missile.hit });
            impactTimer = window.setTimeout(() => {
                setImpact(null);
                onMissileComplete?.();
            }, IMPACT_MS);
        };

        return () => {
            flight.cancel();
            if (impactTimer) window.clearTimeout(impactTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [missile?.seq]);

    const shipByCell = new Map<string, string>();
    for (const ship of ships) {
        for (const cell of ship.cells) {
            shipByCell.set(key(cell.row, cell.col), ship.name);
        }
    }

    const attackByCell = new Map<string, boolean>();
    for (const attack of attacks) {
        attackByCell.set(key(attack.row, attack.col), attack.hit);
    }

    const sunkSet = new Set(sunkCells.map((c) => key(c.row, c.col)));
    const previewSet = new Set(previewCells.map((c) => key(c.row, c.col)));

    return (
        <div ref={containerRef} style={{ display: 'inline-block', position: 'relative' }}>
            <style>{`
                @keyframes bsExplode {
                    0%   { transform: translate(-50%, -50%) scale(.25); opacity: 1; }
                    55%  { opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1.7); opacity: 0; }
                }
                @keyframes bsSplash {
                    0%   { transform: translate(-50%, -50%) scale(.3); opacity: .95; }
                    100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
                }
            `}</style>

            {/* Column labels */}
            <div style={{ display: 'grid', gridTemplateColumns: `28px repeat(${GRID_SIZE}, 1fr)`, gap: 3 }}>
                <div />
                {COL_LABELS.map((label) => (
                    <div key={label} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.7)' }}>
                        {label}
                    </div>
                ))}
            </div>

            {Array.from({ length: GRID_SIZE }, (_, row) => (
                <div key={row} style={{ display: 'grid', gridTemplateColumns: `28px repeat(${GRID_SIZE}, 1fr)`, gap: 3, marginTop: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(226,232,240,0.7)' }}>
                        {row + 1}
                    </div>
                    {Array.from({ length: GRID_SIZE }, (_, col) => {
                        const k = key(row, col);
                        const shipName = shipByCell.get(k);
                        const isSunk = sunkSet.has(k);
                        const isPreview = previewSet.has(k);
                        const suppressed = k === pendingCell;
                        const isAttacked = attackByCell.has(k) && !suppressed;
                        const attackHit = isAttacked && attackByCell.get(k) === true;

                        let background = 'rgba(15, 23, 42, 0.55)';
                        if (shipName) {
                            background = SHIP_COLORS[shipName] ?? '#64748b';
                        }
                        if (isSunk) {
                            background = '#7f1d1d';
                        }
                        if (isPreview) {
                            background = previewValid ? 'rgba(56, 189, 248, 0.55)' : 'rgba(239, 68, 68, 0.55)';
                        }

                        const clickable = interactive && !!onCellClick;

                        return (
                            <button
                                key={col}
                                type="button"
                                data-cell={k}
                                disabled={!clickable}
                                onClick={clickable ? () => onCellClick?.(row, col) : undefined}
                                onMouseEnter={onCellHover ? () => onCellHover(row, col) : undefined}
                                onMouseLeave={onCellLeave}
                                style={{
                                    width: CELL,
                                    height: CELL,
                                    borderRadius: 6,
                                    border: '1px solid rgba(148, 163, 184, 0.35)',
                                    background,
                                    cursor: clickable ? 'pointer' : 'default',
                                    transition: 'background 0.15s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                }}
                            >
                                {isAttacked && (attackHit ? <HitMarker /> : <MissMarker />)}
                            </button>
                        );
                    })}
                </div>
            ))}

            {/* Missile (kept mounted, animated via the Web Animations API). */}
            <div
                ref={missileRef}
                aria-hidden
                style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', willChange: 'transform', zIndex: 20 }}
            >
                <MissileIcon />
            </div>

            {impact && (
                <div style={{ position: 'absolute', left: impact.x, top: impact.y, pointerEvents: 'none', zIndex: 25 }}>
                    {impact.hit ? <Explosion /> : <Splash />}
                </div>
            )}
        </div>
    );
}

function HitMarker() {
    return (
        <span
            style={{
                width: '64%',
                height: '64%',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 50% 38%, #fde68a 0%, #fb923c 38%, #ef4444 68%, #7f1d1d 100%)',
                boxShadow: '0 0 7px 1px rgba(248,113,113,0.75)',
            }}
        />
    );
}

function MissMarker() {
    return (
        <span style={{ position: 'relative', width: '56%', height: '56%' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(125,211,252,0.85)' }} />
            <span style={{ position: 'absolute', inset: '34%', borderRadius: '50%', background: 'rgba(191,219,254,0.95)' }} />
        </span>
    );
}

function MissileIcon() {
    // Points right (0°); the flight rotates it toward the target.
    return (
        <svg width={MISSILE_W} height={MISSILE_H} viewBox="0 0 48 16" fill="none">
            {/* exhaust trail */}
            <path d="M0 8 L14 5 L14 11 Z" fill="rgba(251,191,36,0.85)" />
            <path d="M4 8 L13 6 L13 10 Z" fill="rgba(248,250,252,0.9)" />
            {/* body */}
            <rect x="12" y="5" width="26" height="6" rx="3" fill="#cbd5e1" />
            <rect x="12" y="5" width="26" height="3" rx="1.5" fill="#e2e8f0" />
            {/* nose */}
            <path d="M38 5 L48 8 L38 11 Z" fill="#ef4444" />
            {/* fins */}
            <path d="M14 5 L20 1 L20 5 Z" fill="#94a3b8" />
            <path d="M14 11 L20 15 L20 11 Z" fill="#94a3b8" />
        </svg>
    );
}

function Explosion() {
    return (
        <span
            style={{
                display: 'block',
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #fef08a 0%, #fb923c 35%, #ef4444 60%, rgba(127,29,29,0) 75%)',
                animation: `bsExplode ${IMPACT_MS}ms ease-out forwards`,
            }}
        />
    );
}

function Splash() {
    return (
        <span
            style={{
                display: 'block',
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '3px solid rgba(186,230,253,0.9)',
                boxShadow: '0 0 0 2px rgba(56,189,248,0.35) inset',
                animation: `bsSplash ${IMPACT_MS}ms ease-out forwards`,
            }}
        />
    );
}
