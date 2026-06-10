import { useEffect, useRef, useState } from 'react';

export default function ZvrkLoadingScreen({
    show = true,
    onComplete,
    fadeOnComplete = true,
}: {
    show?: boolean;
    onComplete?: () => void;
    fadeOnComplete?: boolean;
}) {
    const [progress, setProgress] = useState(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    });

    useEffect(() => {
        if (!show) return;
        setProgress(0);
        let p = 0;
        const iv = setInterval(() => {
            p += Math.random() * 18;
            if (p >= 100) {
                p = 100;
                clearInterval(iv);
                setTimeout(() => onCompleteRef.current?.(), 300);
            }
            setProgress(Math.min(p, 100));
        }, 80);
        return () => clearInterval(iv);
    }, [show]);

    if (!show) return null;

    return (
        <div
            className="zls-hue"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1.5rem',
                transition: 'opacity 0.4s',
                opacity: fadeOnComplete && progress >= 100 ? 0 : 1,
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800;900&display=swap');
                @keyframes zls-rotate { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
                @keyframes zls-hue {
                    0%   { background: #e8f0ff; }
                    25%  { background: #ffe8e8; }
                    50%  { background: #e8ffe8; }
                    75%  { background: #fff3e0; }
                    100% { background: #e8f0ff; }
                }
                .zls-hue { animation: zls-hue 3s ease-in-out infinite; }
                .zls-spin { display: inline-block; animation: zls-rotate 3s linear infinite; transform-origin: center; }
            `}</style>

            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '6rem', color: '#2f3336', lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                <span className="zls-spin" style={{ position: 'relative', display: 'inline-block' }}>
                    <span style={{ position: 'absolute', top: '-0.1em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5em', lineHeight: 1.1, color: '#2f3336' }}>|</span>
                    v
                </span>
            </span>

            <div style={{ width: 240, height: 3, backgroundColor: '#eceef1', borderRadius: 99, overflow: 'hidden' }}>
                <div
                    style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, #005bc2 ${progress < 40 ? 0 : progress - 40}%, #FA532F ${progress < 60 ? 50 : progress - 10}%, #72D660 100%)`,
                        transition: 'width 0.08s linear',
                        borderRadius: 99,
                    }}
                />
            </div>
        </div>
    );
}
