import type { CSSProperties } from 'react';

/**
 * Procedurally rendered playing cards shared across game boards. Instead of shipping
 * one SVG per card, every card face is drawn here from a suit symbol + rank label, so
 * a board only needs to parse its own card-string format into { suit, rank }.
 *
 * `suit` accepts either full names ('hearts', 'spades', …) or single letters
 * ('H', 'D', 'C', 'S'); `rank` is the already-formatted label to print ('A', '10', 'J').
 */

export type CardSize = 'sm' | 'md' | 'lg' | 'xl';

const CARD_DIMENSIONS: Record<CardSize, string> = {
    sm: 'h-14 w-10',
    md: 'h-24 w-16',
    lg: 'h-28 w-20',
    xl: 'h-32 w-[5.75rem]',
};

const SUIT_SYMBOLS: Record<string, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
    S: '♠',
};

const RED_SUITS = new Set(['hearts', 'diamonds', 'H', 'D']);

export function PlayingCard({ suit, rank, size = 'md' }: { suit: string; rank: string; size?: CardSize }) {
    const symbol = SUIT_SYMBOLS[suit] ?? suit;
    const isRed = RED_SUITS.has(suit);
    const color = isRed ? 'text-red-600' : 'text-slate-900';
    const pip = size === 'sm' ? 'text-xl' : size === 'md' ? 'text-4xl' : 'text-5xl';
    const index = size === 'sm' ? 'text-[10px]' : 'text-sm';

    return (
        <div
            className={`relative rounded-lg border border-slate-300 bg-white shadow-md ${CARD_DIMENSIONS[size]} ${color}`}
        >
            <span className={`absolute left-1 top-0.5 flex flex-col items-center font-bold leading-none ${index}`}>
                <span>{rank}</span>
                <span>{symbol}</span>
            </span>
            <span className={`absolute inset-0 flex items-center justify-center ${pip}`}>{symbol}</span>
            <span
                className={`absolute bottom-0.5 right-1 flex rotate-180 flex-col items-center font-bold leading-none ${index}`}
            >
                <span>{rank}</span>
                <span>{symbol}</span>
            </span>
        </div>
    );
}

export function CardBack({
    size = 'md',
    className = '',
    style,
}: {
    size?: CardSize;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            className={`rounded-lg border-2 border-amber-100/30 shadow-md ${CARD_DIMENSIONS[size]} ${className}`}
            style={{
                backgroundColor: '#9b2c2c',
                backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 6px, transparent 6px 12px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.18) 0 6px, transparent 6px 12px)',
                ...style,
            }}
        />
    );
}
