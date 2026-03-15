import InputError from '@/Components/InputError';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const floatingItems = [
    { emoji: '🎲', style: { top: '12%', left: '18%', animationDelay: '0s', animationDuration: '6s', fontSize: '2.5rem' } },
    { emoji: '♟️', style: { top: '25%', left: '72%', animationDelay: '1.2s', animationDuration: '7s', fontSize: '2rem' } },
    { emoji: '🃏', style: { top: '55%', left: '25%', animationDelay: '0.5s', animationDuration: '8s', fontSize: '2.2rem' } },
    { emoji: '🎯', style: { top: '70%', left: '65%', animationDelay: '2s', animationDuration: '6.5s', fontSize: '2rem' } },
    { emoji: '🚢', style: { top: '40%', left: '45%', animationDelay: '0.8s', animationDuration: '7.5s', fontSize: '1.8rem' } },
    { emoji: '🔴', style: { top: '80%', left: '35%', animationDelay: '1.5s', animationDuration: '9s', fontSize: '1.5rem' } },
    { emoji: '🟡', style: { top: '18%', left: '40%', animationDelay: '3s', animationDuration: '7s', fontSize: '1.5rem' } },
    { emoji: '♠️', style: { top: '5%', left: '55%', animationDelay: '0.3s', animationDuration: '8.5s', fontSize: '2rem' } },
    { emoji: '🎮', style: { top: '35%', left: '10%', animationDelay: '2.5s', animationDuration: '7s', fontSize: '1.8rem' } },
    { emoji: '⭐', style: { top: '48%', left: '78%', animationDelay: '1.8s', animationDuration: '5.5s', fontSize: '1.4rem' } },
    { emoji: '♦️', style: { top: '75%', left: '10%', animationDelay: '2.2s', animationDuration: '6.5s', fontSize: '1.8rem' } },
];

export default function Register() {
    const [exiting, setExiting] = useState(false);
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

    const goToLogin = (e: React.MouseEvent) => {
        e.preventDefault();
        setExiting(true);
        setTimeout(() => router.visit(route('login')), 350);
    };

    return (
        <>
            <Head title="Registracija" />
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
                    33% { transform: translateY(-18px) rotate(5deg); opacity: 1; }
                    66% { transform: translateY(-8px) rotate(-5deg); opacity: 0.85; }
                }
                .floating { animation: float linear infinite; }
                @keyframes slideInFromRight {
                    from { transform: translateX(60px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutToRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(60px); opacity: 0; }
                }
                .slide-in-right { animation: slideInFromRight 0.45s cubic-bezier(0.22,1,0.36,1) both; }
                .slide-out-right { animation: slideOutToRight 0.35s cubic-bezier(0.22,1,0.36,1) both; }
            `}</style>

            <div className={`min-h-screen flex ${exiting ? 'slide-out-right' : 'slide-in-right'}`}>
                {/* Lijeva strana — forma */}
                <div className="w-full lg:w-1/2 bg-[#FFFBF5] flex flex-col">
                    {/* Back arrow */}
                    <div className="px-10 pt-7">
                        <Link href={route('welcome')} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                            Back
                        </Link>
                    </div>

                    {/* Mobile navbar */}
                    <nav className="flex items-center px-8 h-[64px] lg:hidden">
                        <Link href={route('welcome')} className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#0C4A6E] rounded-[8px] flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                            </div>
                            <span className="font-display text-[20px] font-extrabold text-stone-900">RiGames</span>
                        </Link>
                    </nav>

                    <div className="flex-1 flex items-center justify-center px-8 py-12">
                        <div className="w-full max-w-[400px]">
                            <div className="mb-8">
                                <h1 className="font-display text-[30px] font-extrabold text-stone-900 mb-2">Kreiraj račun</h1>
                                <p className="text-stone-500 text-[15px]">Registriraj se i počni igrati.</p>
                            </div>

                            <form onSubmit={submit} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="name" className="text-sm font-semibold text-stone-700">Ime</label>
                                    <input
                                        id="name"
                                        type="text"
                                        name="name"
                                        value={data.name}
                                        autoComplete="name"
                                        autoFocus
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="Tvoje ime"
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-sm font-semibold text-stone-700">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        autoComplete="username"
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="tvoj@email.com"
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="password" className="text-sm font-semibold text-stone-700">Lozinka</label>
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="password_confirmation" className="text-sm font-semibold text-stone-700">Potvrdi lozinku</label>
                                    <input
                                        id="password_confirmation"
                                        type="password"
                                        name="password_confirmation"
                                        value={data.password_confirmation}
                                        autoComplete="new-password"
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <InputError message={errors.password_confirmation} />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3.5 rounded-xl bg-[#0C4A6E] text-[15px] font-semibold text-white hover:bg-[#083344] transition disabled:opacity-50 mt-2"
                                >
                                    {processing ? 'Kreiranje...' : 'Registriraj se'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 mt-6">
                                Već imaš račun?{' '}
                                <a href={route('login')} onClick={goToLogin} className="font-semibold text-[#0C4A6E] hover:underline">
                                    Prijavi se
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Desna strana — animacija */}
                <div className="hidden lg:flex w-1/2 bg-[#0C4A6E] relative overflow-hidden flex-col items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0C4A6E] via-[#0e5a82] to-[#1a3a5c]" />

                    {floatingItems.map((item, i) => (
                        <div key={i} className="floating absolute select-none" style={item.style as React.CSSProperties}>
                            {item.emoji}
                        </div>
                    ))}

                    {/* Logo — gore desno */}
                    <div className="absolute top-8 right-8 z-10">
                        <Link href={route('welcome')} className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-white/10 rounded-[10px] flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                            </div>
                            <span className="font-display text-[24px] font-extrabold text-white">RiGames</span>
                        </Link>
                    </div>

                    {/* Tekst — dolje lijevo */}
                    <div className="absolute bottom-10 right-8 z-10 text-right max-w-[512px]">
                        <h2 className="font-display text-[52px] font-extrabold text-white leading-tight mb-3">
                            Novi igrač?<br />Dobrodošao<br />u igru.
                        </h2>
                        <p className="text-sky-200 text-[16px] leading-relaxed">
                            Besplatno, bez reklama,<br />samo čista zabava s ekipom.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
