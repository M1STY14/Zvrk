import type { CSSProperties, ReactNode } from 'react';

type Props = {
    disconnected: boolean;
    active: boolean;
    title: string;
    style: CSSProperties;
    children: ReactNode;
};

/** Corner / board player marker with shared disconnect styling (e.g. Ludo). */
export default function PlayerBoardAvatar({ disconnected, active, title, style, children }: Props) {
    return (
        <div
            style={{
                ...style,
                opacity: disconnected ? 0.45 : 1,
                animation: active && !disconnected ? 'avatarPulse 1s ease-in-out infinite' : 'none',
                transition: 'box-shadow 0.3s, opacity 0.3s',
            }}
            title={disconnected ? `${title} (odspojen)` : title}
        >
            {children}
            {disconnected && (
                <span style={{ fontSize: 7, fontWeight: 800, lineHeight: 1, marginTop: 1 }}>OFF</span>
            )}
        </div>
    );
}
