import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Suspense } from 'react';

const games = [
    { name: 'Tic-Tac-Toe', desc: 'Brza partija, 2 igrača', players: '2P', emoji: '❌⭕', bg: '#18181b' },
    { name: 'Čovjče ne ljuti se', desc: 'Utrka do cilja', players: '2-4P', emoji: '🎲', bg: '#27272a' },
    { name: 'Dama', desc: 'Preskoči i osvoji', players: '2P', emoji: '⛀', bg: '#1c1c1e' },
    { name: '4 u nizu', desc: 'Spusti i pobijedi', players: '2P', emoji: '🔴🟡', bg: '#18181b' },
    { name: 'Potapanje brodova', desc: 'Potopi protivničku flotu', players: '2P', emoji: '🚢', bg: '#27272a' },
    { name: 'Uno', desc: 'Boje, brojevi, kaos!', players: '2-6P', emoji: '🃏', bg: '#1c1c1e' },
    { name: 'Bela', desc: 'Hrvatski klasik', players: '4P', emoji: '♠♥', bg: '#18181b' },
    { name: 'Snaps', desc: 'Tko je brži?', players: '2-4P', emoji: '⚡', bg: '#27272a' },
];

const steps = [
    { num: '1', title: 'Napravi račun', desc: 'Registriraj se u par sekundi. Samo email i lozinka — gotovo.' },
    { num: '2', title: 'Uđi u sobu', desc: 'Kreiraj novu sobu ili se pridruži postojećoj. Pozovi ekipu.' },
    { num: '3', title: 'Igraj i pobijedi!', desc: 'Natječi se uživo, prati statistiku i popni se na ljestvicu.' },
];

function ZvrkModel() {
    const { scene } = useGLTF('/models/untitled4.glb');
    const ref = useRef<any>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.3;
    });
    return <primitive ref={ref} object={scene} scale={5} rotation={[0, 0, 0]} />;
}

export default function Welcome({ auth }: PageProps) {

    return (
        <>
            <Head title="Početna" />

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
            `}</style>

            <div className="min-h-screen" style={{ backgroundColor: '#f9f9fb', color: '#2f3336' }}>

                {/* Navbar */}
                <header className="fixed top-0 w-full z-50 border-b" style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', borderColor: '#eceef1' }}>
                    <nav className="flex justify-between items-center px-8 py-4 max-w-screen-xl mx-auto">
                        <div>
                            <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" />
                        </div>

                        <div className="hidden md:flex items-center gap-10">
                            <a href="#igre" className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                Igre
                            </a>
                            <a href="#kako-igrati" className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                Kako igrati
                            </a>
                            <Link href={route('about')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                O nama
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link href={route('dashboard')}
                                    className="px-6 py-2 rounded-full text-sm font-bold transition-colors"
                                    style={{ color: '#005bc2' }}>
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')}
                                        className="px-6 py-2 rounded-full text-sm font-bold transition-all"
                                        style={{ color: '#005bc2' }}
                                        onMouseOver={e => { e.currentTarget.style.color = '#F5C842'; e.currentTarget.style.filter = 'drop-shadow(0 0 8px #F5C84288)'; }}
                                        onMouseOut={e => { e.currentTarget.style.color = '#005bc2'; e.currentTarget.style.filter = 'none'; }}>
                                        Prijava
                                    </Link>
                                    <Link href={route('register')}
                                        className="btn-glow px-6 py-2 rounded-full text-sm font-bold text-white transition-all"
                                        style={{ background: '#18181b', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
                                        onMouseMove={e => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            e.currentTarget.style.backgroundImage = `radial-gradient(circle at ${x}px ${y}px, rgba(245,200,66,0.35), transparent 60%)`;
                                            e.currentTarget.style.backgroundColor = '#18181b';
                                        }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundImage = 'none'; e.currentTarget.style.backgroundColor = '#18181b'; }}>
                                        Registracija
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                {/* Hero */}
                <section className="pt-40 pb-24 overflow-hidden relative">
                    <div className="max-w-screen-xl mx-auto px-0 grid grid-cols-1 lg:grid-cols-2 items-center gap-16">

                        {/* 3D Model */}
                        <div className="flex justify-center items-center h-[550px] w-[550px]" style={{ pointerEvents: 'none' }}>
                            <Canvas camera={{ position: [0, 2, 8], fov: 45 }} style={{ background: 'transparent' }}>
                                <Suspense fallback={null}>
                                    <Stage environment="sunset" intensity={0.6}>
                                        <ZvrkModel />
                                    </Stage>
                                </Suspense>
                            </Canvas>
                        </div>

                        {/* Text */}
                        <div className="title-reveal">
                            <h1 className="font-black tracking-tighter leading-none mb-4"
                                style={{ fontFamily: 'Manrope, sans-serif', fontSize: 'clamp(5rem, 10vw, 8rem)', color: '#2f3336' }}>
                                Z<span className="zvrk-spin" style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{ position: 'absolute', top: '-0.1em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5em', lineHeight: 1.1, color: '#2f3336' }}>|</span>
                                    v
                                </span>rk
                            </h1>
                            <h2 className="font-bold tracking-tight mb-6"
                                style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.75rem', color: '#005bc2' }}>
                                Igraj se s ekipom. Bilo kad, bilo gdje.
                            </h2>
                            <p className="text-lg leading-relaxed max-w-md mb-10" style={{ color: '#5c5f63' }}>
                                Klasične društvene igre u browseru. Pozovi prijatelje, uđi u sobu i igraj uživo — bez instalacije.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href={auth.user ? route('dashboard') : route('register')}
                                    className="btn-glow flex items-center justify-center gap-2 px-10 py-4 rounded-full font-bold text-lg text-white transition-all"
                                    style={{ background: '#18181b', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                                    onMouseMove={e => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const y = e.clientY - rect.top;
                                        e.currentTarget.style.backgroundImage = `radial-gradient(circle at ${x}px ${y}px, rgba(245,200,66,0.35), transparent 60%)`;
                                        e.currentTarget.style.backgroundColor = '#18181b';
                                    }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundImage = 'none'; e.currentTarget.style.backgroundColor = '#18181b'; }}>
                                    Počni igrati
                                </Link>
                                <a href="#igre"
                                    className="btn-glow flex items-center justify-center px-10 py-4 rounded-full font-bold text-lg transition-all"
                                    style={{ backgroundColor: '#eceef1', color: '#2f3336' }}
                                    onMouseMove={e => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const y = e.clientY - rect.top;
                                        e.currentTarget.style.backgroundImage = `radial-gradient(circle at ${x}px ${y}px, rgba(245,200,66,0.4), transparent 60%)`;
                                        e.currentTarget.style.backgroundColor = '#eceef1';
                                    }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundImage = 'none'; }}>
                                    Pregledaj igre
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Game Carousel */}
                <section id="igre" className="py-20 overflow-hidden" style={{ backgroundColor: '#f9f9fb' }}>
                    <div className="max-w-screen-xl mx-auto px-8 mb-12 flex items-center justify-between">
                        <div>
                            <h2 className="font-extrabold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.25rem', color: '#2f3336' }}>
                                Dostupne igre
                            </h2>
                            <p className="mt-1" style={{ color: '#5c5f63' }}>8 klasičnih igara za svaku prigodu</p>
                        </div>
                        <span className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest animate-pulse" style={{ color: '#005bc2' }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#005bc2' }} />
                            Uskoro uživo
                        </span>
                    </div>

                    <div className="relative w-full overflow-hidden py-4">
                        <div className="carousel-track gap-6 px-8">
                            {[...games, ...games].map((game, i) => (
                                <div key={i} className="relative flex-shrink-0 w-[380px] h-[260px] overflow-hidden cursor-pointer group"
                                    style={{ backgroundColor: game.bg, borderRadius: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                                        <span style={{ fontSize: '8rem' }}>{game.emoji}</span>
                                    </div>
                                    <div className="absolute inset-0 flex flex-col justify-between p-8"
                                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }}>
                                        <div>
                                            <span className="text-xs font-semibold px-3 py-1 rounded-full"
                                                style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: 'white' }}>
                                                {game.players}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold tracking-tight leading-none mb-1"
                                                style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2rem', color: 'white' }}>
                                                {game.name}
                                            </h3>
                                            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{game.desc}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Bento - Kako igrati */}
                <section id="kako-igrati" className="py-20 bg-white">
                    <div className="max-w-screen-xl mx-auto px-8">
                        <h2 className="font-extrabold tracking-tight mb-12" style={{ fontFamily: 'Manrope, sans-serif', fontSize: '2.25rem', color: '#2f3336' }}>
                            Kako igrati
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ minHeight: '360px' }}>
                            {/* Velika kartica */}
                            <div className="md:col-span-2 rounded-2xl p-10 relative overflow-hidden group flex flex-col justify-between"
                                style={{ backgroundColor: '#f3f3f6' }}>
                                <div>
                                    <h3 className="font-extrabold text-3xl mb-4" style={{ fontFamily: 'Manrope, sans-serif', color: '#2f3336' }}>
                                        Napravljeno za zajednicu
                                    </h3>
                                    <p className="text-lg max-w-sm" style={{ color: '#5c5f63' }}>
                                        Studentski projekt RITEH-a iz Rijeke. Besplatno, bez reklama, samo čista zabava s ekipom.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 mt-8">
                                    <div className="flex items-center gap-2 bg-amber-100 rounded-full px-4 py-2">
                                        <span className="text-sm">⚓</span>
                                        <span className="text-sm font-semibold text-amber-800">RITEH, Rijeka</span>
                                    </div>
                                </div>
                                <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-all text-[16rem] pointer-events-none">
                                    🎲
                                </div>
                            </div>

                            {/* Koraci */}
                            <div className="flex flex-col gap-4">
                                {steps.map((step) => (
                                    <div key={step.num} className="rounded-2xl p-6 flex items-start gap-4 transition-transform hover:-translate-y-0.5"
                                        style={{ backgroundColor: step.num === '1' ? '#005bc2' : step.num === '2' ? '#a63c18' : '#8e2fbd', color: 'white' }}>
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
                    <div className="flex flex-col md:flex-row justify-between items-center px-12 py-12 max-w-screen-xl mx-auto">
                        <div className="mb-8 md:mb-0">
                            <div className="text-2xl font-black mb-2" style={{ fontFamily: 'Manrope, sans-serif', color: '#18181b' }}>Zvrk</div>
                            <p className="text-sm max-w-xs" style={{ color: '#64748b' }}>Studentski projekt @ RITEH, Rijeka.</p>
                            <p className="text-xs mt-4" style={{ color: '#94a3b8' }}>© 2026 Zvrk. Sva prava pridržana.</p>
                        </div>

                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
                            {['Tic-Tac-Toe', 'Čovjče ne ljuti se', 'Dama', '4 u nizu'].map(g => (
                                <span key={g} className="text-sm font-medium" style={{ color: '#64748b' }}>{g}</span>
                            ))}
                        </div>

                        <div className="mt-8 md:mt-0 flex gap-4">
                            <Link href={route('about')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>O nama</Link>
                            <Link href={route('login')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>Prijava</Link>
                            <Link href={route('register')} className="text-sm font-medium transition-colors" style={{ color: '#64748b' }}>Registracija</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
