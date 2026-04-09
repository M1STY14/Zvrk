import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useState } from 'react';

const games = [
    { name: 'Tic-Tac-Toe', desc: 'Brza partija, 2 igrača', players: '2P', emoji: '❌⭕', bg: '#18181b', thumbnail: '/images/homepage_games_thumbnails/tic_tac_toe_right_side.svg' },
    { name: 'Čovječe ne ljuti se', desc: 'Utrka do cilja', players: '2-4P', emoji: '🎲', bg: '#27272a', thumbnail: '/images/homepage_games_thumbnails/covjece_ne_ljuti_se_left_side.svg' },
    { name: 'Dama', desc: 'Preskoči i osvoji', players: '2P', emoji: '⛀', bg: '#1c1c1e', thumbnail: '/images/homepage_games_thumbnails/dama_right_side.svg' },
    { name: '4 u nizu', desc: 'Spusti i pobijedi', players: '2P', emoji: '🔴🟡', bg: '#18181b', thumbnail: '/images/homepage_games_thumbnails/4_u_nizu_left_side.svg' },
    { name: 'Potapanje brodova', desc: 'Potopi protivničku flotu', players: '2P', emoji: '🚢', bg: '#27272a', thumbnail: '/images/homepage_games_thumbnails/potapanje_brodova_right_side.svg' },
    { name: 'Uno', desc: 'Boje, brojevi, kaos!', players: '2-6P', emoji: '🃏', bg: '#1c1c1e', thumbnail: '/images/homepage_games_thumbnails/uno_left_side.svg' },
    { name: 'Bela', desc: 'Hrvatski klasik', players: '4P', emoji: '♠♥', bg: '#18181b', thumbnail: '/images/homepage_games_thumbnails/bels_right_side.svg' },
    { name: 'Snaps', desc: 'Tko je brži?', players: '2-4P', emoji: '⚡', bg: '#27272a', thumbnail: '/images/homepage_games_thumbnails/snaps_left_side.svg' },
];

const gameCardPositions = [
    { top: '15%', side: 'right' },
    { top: '22%', side: 'left' },
    { top: '34%', side: 'right' },
    { top: '40%', side: 'left' },
    { top: '52%', side: 'right' },
    { top: '58%', side: 'left' },
    { top: '77%', side: 'right' },
    { top: '83%', side: 'left' },
] as const;

const steps = [
    { num: '1', title: 'Napravi račun', desc: 'Registriraj se u par sekundi. Samo email i lozinka — gotovo.' },
    { num: '2', title: 'Uđi u sobu', desc: 'Kreiraj novu sobu ili se pridruži postojećoj. Pozovi ekipu.' },
    { num: '3', title: 'Igraj i pobijedi!', desc: 'Natječi se uživo, prati statistiku i popni se na ljestvicu.' },
];

function ZvrkModel() {
    const { scene } = useGLTF('/models/new_un_lower2.glb');
    return <primitive object={scene} scale={3} rotation={[0, 0, 0]} />;
}

export default function Welcome({ auth }: PageProps) {

    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let p = 0;
        const iv = setInterval(() => {
            p += Math.random() * 18;
            if (p >= 100) {
                p = 100;
                clearInterval(iv);
                setTimeout(() => setLoading(false), 300);
            }
            setProgress(Math.min(p, 100));
        }, 80);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('scroll-visible');
                });
            },
            { threshold: 0.12 }
        );
        document.querySelectorAll('.scroll-hidden').forEach((el) => observer.observe(el));

        // Side nav — sekcije
        const sideLinks = document.querySelectorAll<HTMLElement>('.side-nav-link');
        const sections = ['#hero-section', '#igre', '#kako-igrati'].map(s => document.querySelector(s));
        const igredLabel = document.getElementById('side-igre-label');
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = sections.indexOf(entry.target);
                    sideLinks.forEach(a => { a.style.color = '#999'; a.style.fontWeight = '400'; });
                    if (idx >= 0 && sideLinks[idx]) { sideLinks[idx].style.color = '#2f3336'; sideLinks[idx].style.fontWeight = '700'; }
                    // Reset game label kad napustimo igre sekciju
                    if (idx !== 1 && igredLabel) igredLabel.textContent = 'IGRE';
                }
            });
        }, { threshold: 0.3 });
        sections.forEach(s => s && sectionObserver.observe(s));

        // Side nav — pojedine igre unutar sekcije
        const gameTiles = document.querySelectorAll<HTMLElement>('.game-tile');
        const gameObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && igredLabel) {
                    igredLabel.textContent = entry.target.getAttribute('data-game') || 'IGRE';
                }
            });
        }, { threshold: 0.6 });
        gameTiles.forEach(t => gameObserver.observe(t));

        return () => { observer.disconnect(); sectionObserver.disconnect(); gameObserver.disconnect(); };
    }, []);

    return (
        <>
            <Head title="Početna" />

            {/* Loading screen */}
            {loading && (
                <div className="loading-hue" style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: '1.5rem',
                    transition: 'opacity 0.4s',
                    opacity: progress >= 100 ? 0 : 1,
                }}>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '6rem', color: '#2f3336', lineHeight: 1, position: 'relative', display: 'inline-block' }}>
                        <span className="zvrk-spin" style={{ position: 'relative', display: 'inline-block' }}>
                            <span style={{ position: 'absolute', top: '-0.1em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5em', lineHeight: 1.1, color: '#2f3336' }}>|</span>
                            v
                        </span>
                    </span>
                    <div style={{ width: 240, height: 3, backgroundColor: '#eceef1', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${progress}%`,
                            background: `linear-gradient(90deg, #005bc2 ${progress < 40 ? 0 : progress - 40}%, #FA532F ${progress < 60 ? 50 : progress - 10}%, #72D660 100%)`,
                            transition: 'width 0.08s linear',
                            borderRadius: 99,
                        }} />
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap');

                .btn-glow {
                    position: relative;
                    overflow: hidden;
                    transition: box-shadow 0.2s ease;
                }
                .btn-glow::before {
                    content: '';
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    background: radial-gradient(circle, rgba(245,200,66,0.5) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .btn-glow:hover::before {
                    opacity: 1;
                }

                .carousel-track {
                    display: flex;
                    width: max-content;
                    animation: scroll 50s linear infinite;
                }
                .carousel-track:hover { animation-play-state: paused; }
                @keyframes scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }

                .zvrk-spin {
                    display: inline-block;
                    animation: zvrk-rotate 3s linear infinite;
                    transform-origin: center;
                }
                @keyframes zvrk-rotate {
                    from { transform: rotateY(0deg); }
                    to   { transform: rotateY(360deg); }
                }

                .title-reveal {
                    opacity: 0;
                    transform: translateY(20px);
                    animation: reveal 1s cubic-bezier(0.16,1,0.3,1) 0.2s forwards;
                }
                @keyframes reveal {
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes hue-bg {
                    0%   { background: #e8f0ff; }
                    25%  { background: #ffe8e8; }
                    50%  { background: #e8ffe8; }
                    75%  { background: #fff3e0; }
                    100% { background: #e8f0ff; }
                }
                .loading-hue { animation: hue-bg 3s ease-in-out infinite; }

                @keyframes ghost-float {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-6px); }
                }

                .scroll-hidden {
                    opacity: 0;
                    transform: translateY(48px);
                    transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
                }
                .scroll-hidden.scroll-visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .scroll-hidden.delay-1 { transition-delay: 0.1s; }
                .scroll-hidden.delay-2 { transition-delay: 0.2s; }
                .scroll-hidden.delay-3 { transition-delay: 0.35s; }
                .scroll-hidden.delay-4 { transition-delay: 0.5s; }

                .game-roadmap-layer {
                    position: relative;
                    min-height: calc(100vw * 5988.5 / 1920);
                }
                .game-roadmap-tile {
                    position: absolute;
                    width: 42%;
                }
                .game-roadmap-tile.side-right {
                    right: 6%;
                }
                .game-roadmap-tile.side-left {
                    left: 6%;
                }

                @media (max-width: 1200px) {
                    #hero-model {
                        width: min(60vw, 640px);
                        height: min(66vw, 760px);
                    }
                    #hero-text {
                        padding-left: 3rem;
                    }
                }

                @media (max-width: 1024px) {
                    .side-nav-link {
                        display: none;
                    }
                    #hero-model {
                        width: min(88vw, 560px);
                        height: min(88vw, 560px);
                    }
                    #hero-text {
                        padding-left: 0;
                        padding-right: 1.25rem;
                        text-align: center;
                    }
                }

                @media (max-width: 900px) {
                    .game-roadmap-layer {
                        min-height: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 1.1rem;
                    }
                    .game-roadmap-tile {
                        position: relative;
                        top: auto !important;
                        left: auto !important;
                        right: auto !important;
                        width: 100%;
                    }
                    .game-roadmap-tile > div {
                        padding: 1.25rem !important;
                    }
                    .game-roadmap-tile h3 {
                        font-size: 1.28rem !important;
                    }
                    .game-roadmap-tile p {
                        font-size: 0.84rem !important;
                        margin-bottom: 0.8rem !important;
                    }
                }

                html { scroll-behavior: smooth; }
            `}</style>

            {/* Side nav */}
            <div style={{ position: 'fixed', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <a href="#hero-section" className="side-nav-link" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', textDecoration: 'none', writingMode: 'vertical-rl', transition: 'color 0.2s, font-weight 0.2s' }}>WELCOMEEEE</a>
                <a href="#igre" className="side-nav-link" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', textDecoration: 'none', writingMode: 'vertical-rl', transition: 'color 0.2s, font-weight 0.2s' }}>
                    <span id="side-igre-label">IGRE</span>
                </a>
                <a href="#kako-igrati" className="side-nav-link" style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#999', textDecoration: 'none', writingMode: 'vertical-rl', transition: 'color 0.2s, font-weight 0.2s' }}>PRAVILA</a>
            </div>

            <div id="gsap-scroller">
            <div className="min-h-screen" style={{ backgroundColor: '#f9f9fb', color: '#2f3336' }}>

                {/* Navbar */}
                <header id="main-nav" className="fixed top-0 w-full z-50 border-b" style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', borderColor: '#eceef1' }}>
                    <nav className="grid grid-cols-3 items-center px-8 py-4 max-w-screen-xl mx-auto">
                        <div>
                            <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" />
                        </div>

                        <div className="hidden md:flex items-center justify-center gap-10">
                            <a href="#igre" className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                Igre
                            </a>
                            <a href="#kako-igrati" className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                Kako igrati
                            </a>
                            <Link href={route('about')} className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                O nama
                            </Link>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            {auth.user ? (
                                <Link href={route('dashboard')}
                                    className="px-6 py-2 rounded-full text-base font-bold transition-colors"
                                    style={{ color: '#005bc2' }}>
                                    Dashboard
                                </Link>) : (
                                <>
                                    <Link href={route('login')}
                                        className="px-6 py-2 rounded-full text-base font-bold transition-all"
                                        style={{ color: '#FA532F' }}
                                        onMouseOut={e => { e.currentTarget.style.color = '#FA532F'; }}>
                                        Prijava
                                    </Link>
                                    <Link href={route('register')}
                                        className="px-6 py-2 rounded-full text-base font-bold text-white transition-all"
                                        style={{ background: '#18181b', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#FA532F'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#18181b'; }}>
                                        Registracija
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                {/* Hero */}
                {/* style={{ backgroundImage: 'url(/images/hero-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center' }} */}
                <section id="hero-section" className="pt-14 pb-14 overflow-hidden relative">
                    <div className="hero-hue-overlay" />
                    <img src="/images/test.svg" alt="" style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        objectFit: 'fill',
                        pointerEvents: 'none', userSelect: 'none',
                        zIndex: 0,
                    }} />
                    <div className="max-w-screen-xl mx-auto px-0 grid grid-cols-1 lg:grid-cols-2 items-center gap-16" style={{ position: 'relative', zIndex: 1 }}>

                        {/* 3D Model */}
                        <div id="hero-model" className="flex justify-center items-center h-[950px] w-[750px]">
                            <Canvas shadows={false} camera={{ position: [19, 19, -90], fov: 45 }} style={{ background: 'transparent' }}>
                                <Suspense fallback={null}>
                                    <Stage environment="sunset" intensity={0.6} shadows={false}>
                                        <ZvrkModel />
                                    </Stage>
                                    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                                </Suspense>
                            </Canvas>
                        </div>

                        {/* Text */}
                        <div id="hero-text" className="title-reveal pl-24">
                            <h1 className="font-black tracking-tighter leading-none mb-4"
                                style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(5rem, 10vw, 8rem)', color: '#2f3336' }}>
                                Z<span className="zvrk-spin" style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{ position: 'absolute', top: '-0.1em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5em', lineHeight: 1.1, color: '#2f3336' }}>|</span>
                                    v
                                </span>rk
                            </h1>
                            <h2 className="font-bold tracking-tight mb-6"
                                style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.75rem', color: '#005bc2' }}>
                                Igraj se s ekipom. 
                                <span style={{ color: '#FA532F' }}> Bilo kad, </span> 
                                <span style={{ color: '#72D660' }}>bilo gdje.</span>
                            </h2>
                            
                            <p className="text-lg leading-relaxed max-w-md mb-10" style={{ color: '#5c5f63' }}>
                                Klasične društvene igre u browseru. Pozovi prijatelje, uđi u sobu i igraj uživo — bez instalacije.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href={auth.user ? route('dashboard') : route('register')}
                                    className="flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-lg text-white transition-all"
                                    style={{ background: '#18181b' }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#005bc2'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = '#18181b'; }}>
                                    Počni igrati
                                </Link>
                                <a href="#igre"
                                    className="flex items-center justify-center px-10 py-4 rounded-full font-bold text-lg transition-all"
                                    style={{ backgroundColor: '#eceef1', color: '#2f3336' }}
                                    onMouseOver={e => { e.currentTarget.style.backgroundColor = '#005bc2'; e.currentTarget.style.color = 'white'; }}
                                    onMouseOut={e => { e.currentTarget.style.backgroundColor = '#eceef1'; e.currentTarget.style.color = '#2f3336'; }}>
                                    Pregledaj igre
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Game Roadmap - vertical */}
                <section id="igre" className="pt-3" style={{
                    backgroundColor: '#f9f9fb',
                    position: 'relative',
                }}>
                    <img src="/images/un.svg" alt="" style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: 'auto',
                        pointerEvents: 'none', userSelect: 'none',
                    }} />
                    <div className="max-w-screen-xl mx-auto px-8" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="game-roadmap-layer">
                            {games.map((game, i) => {
                                const accents = ['#005bc2','#FA532F','#72D660','#9333ea','#f59e0b','#ec4899','#14b8a6','#ef4444'];
                                const accent = accents[i];
                                const isBela = game.name === 'Bela';
                                const isDama = game.name === 'Dama';
                                const shiftContentRight = isBela || isDama;
                                const pos = gameCardPositions[i] ?? { top: `${8 + i * 10}%`, side: i % 2 ? 'left' : 'right' };
                                const cardBackground = `url(${game.thumbnail}) center / cover no-repeat`;
                                return (
                                    <div key={game.name} className={`scroll-hidden game-tile game-roadmap-tile ${pos.side === 'left' ? 'side-left' : 'side-right'}`} data-game={game.name.toUpperCase()} style={{
                                        top: pos.top,
                                        transitionDelay: `${i * 0.08}s`,
                                    }}>
                                        <div style={{
                                            width: '100%',
                                            background: cardBackground,
                                            backdropFilter: 'blur(8px)',
                                            borderRadius: '1.25rem',
                                            padding: '2rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                            boxShadow: 'none',
                                        }}
                                            onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                                            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', marginLeft: shiftContentRight ? '0.6rem' : 0, visibility: isDama ? 'hidden' : 'visible' }}>{game.emoji}</div>
                                            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 900, fontSize: '1.5rem', color: '#2f3336', marginBottom: '0.4rem', marginLeft: shiftContentRight ? '0.6rem' : 0 }}>{game.name}</h3>
                                            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem', marginLeft: shiftContentRight ? '0.6rem' : 0 }}>{game.desc}</p>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 99, backgroundColor: accent + '22', color: accent, marginLeft: shiftContentRight ? '0.6rem' : 0 }}>{game.players}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Bento - Kako igrati */}
                <section id="kako-igrati" className="py-20 bg-white">
                    <div className="max-w-screen-xl mx-auto px-8">
                        <h2 className="scroll-hidden font-extrabold tracking-tight mb-12" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.25rem', color: '#2f3336' }}>
                            Kako igrati
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ minHeight: '360px' }}>
                            {/* Velika kartica */}
                            <div className="scroll-hidden md:col-span-2 rounded-2xl p-10 relative overflow-hidden group flex flex-col justify-between"
                                style={{ backgroundColor: '#f3f3f6', minHeight: '380px', transitionDelay: '0.1s' }}>

                                <p className="font-black leading-tight"
                                    style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#2f3336' }}>

                                    {/* Pac-Man na početku */}
                                    <svg width="1em" height="1em" viewBox="0 0 100 100"
                                        style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.15em' }}>
                                        <path fill="#FFD700">
                                            <animate attributeName="d"
                                                values="M50,50 L95,15 A48,48,0,1,0,95,85 Z;M50,50 L95,49 A48,48,0,1,0,95,51 Z;M50,50 L95,15 A48,48,0,1,0,95,85 Z"
                                                dur="0.4s" repeatCount="indefinite" />
                                        </path>
                                    </svg>

                                    {' '}Studentski projekt{' '}

                                    {/* Duh 1 - plavi */}
                                    <svg width="0.7em" height="0.8em" viewBox="0 0 36 42"
                                        style={{ display: 'inline-block', verticalAlign: 'middle', animation: 'ghost-float 2s ease-in-out 0s infinite' }}>
                                        <path d="M18 2C9.16 2 2 9.16 2 18V40L8 34L14 40L18 34L22 40L28 34L34 40V18C34 9.16 26.84 2 18 2Z" fill="#6ea4ff"/>
                                        <circle cx="13" cy="17" r="4" fill="white"/><circle cx="23" cy="17" r="4" fill="white"/>
                                        <circle cx="14" cy="18" r="2" fill="#1a1a2e"/><circle cx="24" cy="18" r="2" fill="#1a1a2e"/>
                                    </svg>

                                    {' '}<span style={{ color: '#005bc2' }}>RITEH-a</span>{' '}
                                    iz Rijeke.{' '}

                                    {/* Duh 2 - crveni */}
                                    <svg width="0.7em" height="0.8em" viewBox="0 0 36 42"
                                        style={{ display: 'inline-block', verticalAlign: 'middle', animation: 'ghost-float 2s ease-in-out 0.5s infinite' }}>
                                        <path d="M18 2C9.16 2 2 9.16 2 18V40L8 34L14 40L18 34L22 40L28 34L34 40V18C34 9.16 26.84 2 18 2Z" fill="#ff6b6b"/>
                                        <circle cx="13" cy="17" r="4" fill="white"/><circle cx="23" cy="17" r="4" fill="white"/>
                                        <circle cx="14" cy="18" r="2" fill="#1a1a2e"/><circle cx="24" cy="18" r="2" fill="#1a1a2e"/>
                                    </svg>

                                    {' '}Besplatno, bez reklama,{' '}

                                    {/* Duh 3 - tirkizni */}
                                    <svg width="0.7em" height="0.8em" viewBox="0 0 36 42"
                                        style={{ display: 'inline-block', verticalAlign: 'middle', animation: 'ghost-float 2s ease-in-out 1s infinite' }}>
                                        <path d="M18 2C9.16 2 2 9.16 2 18V40L8 34L14 40L18 34L22 40L28 34L34 40V18C34 9.16 26.84 2 18 2Z" fill="#5eead4"/>
                                        <circle cx="13" cy="17" r="4" fill="white"/><circle cx="23" cy="17" r="4" fill="white"/>
                                        <circle cx="14" cy="18" r="2" fill="#1a1a2e"/><circle cx="24" cy="18" r="2" fill="#1a1a2e"/>
                                    </svg>

                                    {' '}samo čista zabava s ekipom.
                                </p>

                                <div className="absolute bottom-4 right-6 opacity-10 group-hover:opacity-20 transition-all text-[5rem] pointer-events-none select-none">
                                    🍒
                                </div>
                            </div>

                            {/* Koraci */}
                            <div className="flex flex-col gap-4">
                                {steps.map((step, si) => (
                                    <div key={step.num} className="scroll-hidden rounded-2xl p-6 flex items-start gap-4 transition-transform hover:-translate-y-0.5"
                                        style={{ backgroundColor: step.num === '1' ? '#FA532F' : step.num === '2' ? '#E8AC80' : '#72D660', color: 'white', transitionDelay: `${0.2 + si * 0.12}s` }}>
                                        <span className="font-black text-2xl opacity-40" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                            {step.num}
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-sm mb-1">{step.title}</h4>
                                            <p className="text-xs opacity-80 leading-relaxed">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start px-12 py-12 max-w-screen-xl mx-auto">
                        <div className="mb-8 md:mb-0">
                            <div> <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" /></div>
                            <p className="text-sm max-w-xs" style={{ color: '#64748b' }}>Studentski projekt @ RITEH, Rijeka.</p>
                            <p className="text-xs mt-4" style={{ color: '#94a3b8' }}>© 2026 Zvrk. Sva prava pridržana.</p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#2f3336' }}>Igre</h4>
                            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                {[games.slice(0, 4), games.slice(4, 8)].map((column, ci) => (
                                    <div key={ci} className="flex flex-col gap-2">
                                        {column.map((g) => (
                                            <span key={g.name} className="text-sm font-medium" style={{ color: '#64748b' }}>{g.name}</span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 md:mt-0 flex flex-col gap-2">
                            <h4 className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: '#2f3336' }}>Platforme</h4>
                            <Link href={route('about')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>O nama</Link>
                            <a href="#" className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>Ljestvica</a>
                            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>GitHub</a>
                            <Link href={route('login')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>Prijava</Link>
                            <Link href={route('register')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>Registracija</Link>
                        </div>
                    </div>
                </footer>
            </div>
            </div>{/* /gsap-scroller */}
        </>
    );
}
