import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

const TYPING_LINES = ['Kreiraj račun.', 'Počni igrati.'];

const floatingItems = [
    { emoji: '🎲', style: { top: '15%', left: '18%', animationDelay: '0s', animationDuration: '6s', fontSize: '2.5rem' } },
    { emoji: '♟️', style: { top: '25%', left: '72%', animationDelay: '1.2s', animationDuration: '7s', fontSize: '2rem' } },
    { emoji: '🃏', style: { top: '55%', left: '25%', animationDelay: '0.5s', animationDuration: '8s', fontSize: '2.2rem' } },
    { emoji: '🎯', style: { top: '70%', left: '65%', animationDelay: '2s', animationDuration: '6.5s', fontSize: '2rem' } },
    { emoji: '🚢', style: { top: '40%', left: '60%', animationDelay: '0.8s', animationDuration: '7.5s', fontSize: '1.8rem' } },
    { emoji: '🔴', style: { top: '80%', left: '35%', animationDelay: '1.5s', animationDuration: '9s', fontSize: '1.5rem' } },
    { emoji: '🟡', style: { top: '18%', left: '40%', animationDelay: '3s', animationDuration: '7s', fontSize: '1.5rem' } },
    { emoji: '♠️', style: { top: '5%', left: '55%', animationDelay: '0.3s', animationDuration: '8.5s', fontSize: '2rem' } },
    { emoji: '🎮', style: { top: '35%', left: '10%', animationDelay: '2.5s', animationDuration: '7s', fontSize: '1.8rem' } },
    { emoji: '⭐', style: { top: '48%', left: '78%', animationDelay: '1.8s', animationDuration: '5.5s', fontSize: '1.4rem' } },
    { emoji: '♦️', style: { top: '75%', left: '10%', animationDelay: '2.2s', animationDuration: '6.5s', fontSize: '1.8rem' } },
];

function useTypewriter(lines: string[], speed = 55, pauseMs = 1200) {
    const [displayed, setDisplayed] = useState<string[]>(lines.map(() => ''));
    const [lineIndex, setLineIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [pausing, setPausing] = useState(false);

    useEffect(() => {
        if (pausing) {
            const t = setTimeout(() => { setPausing(false); setLineIndex(i => i + 1); }, pauseMs);
            return () => clearTimeout(t);
        }
        if (lineIndex >= lines.length) return;
        if (charIndex < lines[lineIndex].length) {
            const t = setTimeout(() => {
                setDisplayed(prev => { const next = [...prev]; next[lineIndex] = lines[lineIndex].slice(0, charIndex + 1); return next; });
                setCharIndex(i => i + 1);
            }, speed);
            return () => clearTimeout(t);
        } else { setPausing(true); setCharIndex(0); }
    }, [charIndex, lineIndex, pausing, lines, speed, pauseMs]);

    return { displayed, currentLine: lineIndex, done: lineIndex >= lines.length };
}

export default function Register() {
    const { displayed, currentLine, done } = useTypewriter(TYPING_LINES);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Registracija" />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap');
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
                    33% { transform: translateY(-18px) rotate(5deg); opacity: 1; }
                    66% { transform: translateY(-8px) rotate(-5deg); opacity: 0.85; }
                }
                .floating { animation: float linear infinite; }
            `}</style>

            <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#f9f9fb', fontFamily: 'Manrope, sans-serif' }}>

                {/* Floating emojis */}
                {floatingItems.map((item, i) => (
                    <div key={i} className="floating absolute select-none pointer-events-none" style={{ ...item.style, zIndex: 0 } as React.CSSProperties}>
                        {item.emoji}
                    </div>
                ))}

                {/* Navbar */}
                <header className="fixed top-0 w-full z-50 border-b" style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', borderColor: '#eceef1' }}>
                    <nav className="grid grid-cols-3 items-center px-8 py-4 max-w-screen-xl mx-auto">
                        <div>
                            <Link href={route('welcome')}>
                                <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" />
                            </Link>
                        </div>
                        <div className="hidden md:flex items-center justify-center gap-10">
                            <a href={route('welcome') + '#igre'} className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
                                onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                                onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                                Igre
                            </a>
                            <a href={route('welcome') + '#kako-igrati'} className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
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
                            <Link href={route('login')} className="px-6 py-2 rounded-full text-base font-bold transition-all" style={{ color: '#FA532F' }}>
                                Prijava
                            </Link>
                            <Link href={route('register')}
                                className="px-6 py-2 rounded-full text-base font-bold text-white transition-all"
                                style={{ background: '#18181b' }}
                                onMouseOver={e => { e.currentTarget.style.background = '#FA532F'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#18181b'; }}>
                                Registracija
                            </Link>
                        </div>
                    </nav>
                </header>

                {/* Form */}
                <div className="pt-28 flex items-center justify-center min-h-screen relative z-10">
                    <div className="w-full max-w-md mx-auto px-8 py-12">

                        <div className="mb-8">
                            <h1 className="font-black tracking-tight leading-none mb-2"
                                style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', color: '#2f3336' }}>
                                {displayed[0]}{!done && currentLine === 0 && <span className="animate-pulse">|</span>}
                            </h1>
                            <p className="font-semibold" style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#64748b' }}>
                                {displayed[1]}{!done && currentLine >= 1 && <span className="animate-pulse">|</span>}
                            </p>
                        </div>

                        <form onSubmit={submit} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="name" className="text-sm font-bold" style={{ color: '#2f3336' }}>Ime</label>
                                <input
                                    id="name"
                                    type="text"
                                    name="name"
                                    value={data.name}
                                    autoComplete="name"
                                    autoFocus
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm transition"
                                    style={{ border: '1.5px solid #eceef1', backgroundColor: '#f9f9fb', color: '#2f3336', outline: 'none' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#005bc2'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#eceef1'; }}
                                    placeholder="Tvoje ime"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="email" className="text-sm font-bold" style={{ color: '#2f3336' }}>Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    autoComplete="username"
                                    onChange={(e) => setData('email', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm transition"
                                    style={{ border: '1.5px solid #eceef1', backgroundColor: '#f9f9fb', color: '#2f3336', outline: 'none' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#005bc2'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#eceef1'; }}
                                    placeholder="tvoj@email.com"
                                    required
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="password" className="text-sm font-bold" style={{ color: '#2f3336' }}>Lozinka</label>
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm transition"
                                    style={{ border: '1.5px solid #eceef1', backgroundColor: '#f9f9fb', color: '#2f3336', outline: 'none' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#005bc2'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#eceef1'; }}
                                    placeholder="••••••••"
                                    required
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="password_confirmation" className="text-sm font-bold" style={{ color: '#2f3336' }}>Potvrdi lozinku</label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    name="password_confirmation"
                                    value={data.password_confirmation}
                                    autoComplete="new-password"
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-sm transition"
                                    style={{ border: '1.5px solid #eceef1', backgroundColor: '#f9f9fb', color: '#2f3336', outline: 'none' }}
                                    onFocus={e => { e.currentTarget.style.borderColor = '#005bc2'; }}
                                    onBlur={e => { e.currentTarget.style.borderColor = '#eceef1'; }}
                                    placeholder="••••••••"
                                    required
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-3.5 rounded-full text-base font-bold text-white transition-all mt-1"
                                style={{ backgroundColor: '#18181b' }}
                                onMouseOver={e => { if (!processing) e.currentTarget.style.backgroundColor = '#72D660'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#18181b'; }}
                            >
                                {processing ? 'Kreiranje...' : 'Registriraj se'}
                            </button>
                        </form>

                        <p className="text-center text-sm mt-6" style={{ color: '#64748b' }}>
                            Već imaš račun?{' '}
                            <Link href={route('login')} className="font-bold" style={{ color: '#005bc2' }}>
                                Prijavi se
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
