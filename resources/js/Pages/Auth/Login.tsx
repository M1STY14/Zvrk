import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const floatingItems = [
    { emoji: '🎲', style: { top: '12%', left: '18%', animationDelay: '0s', animationDuration: '6s', fontSize: '2.5rem' } },
    { emoji: '♟️', style: { top: '25%', left: '62%', animationDelay: '1.2s', animationDuration: '7s', fontSize: '2rem' } },
    { emoji: '🃏', style: { top: '55%', left: '25%', animationDelay: '0.5s', animationDuration: '8s', fontSize: '2.2rem' } },
    { emoji: '🎯', style: { top: '70%', left: '65%', animationDelay: '2s', animationDuration: '6.5s', fontSize: '2rem' } },
    { emoji: '🚢', style: { top: '40%', left: '45%', animationDelay: '0.8s', animationDuration: '7.5s', fontSize: '1.8rem' } },
    { emoji: '🔴', style: { top: '80%', left: '35%', animationDelay: '1.5s', animationDuration: '9s', fontSize: '1.5rem' } },
    { emoji: '🟡', style: { top: '18%', left: '40%', animationDelay: '3s', animationDuration: '7s', fontSize: '1.5rem' } },
];

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Prijava" />
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
                    33% { transform: translateY(-18px) rotate(5deg); opacity: 1; }
                    66% { transform: translateY(-8px) rotate(-5deg); opacity: 0.85; }
                }
                .floating { animation: float linear infinite; }
            `}</style>

            <div className="min-h-screen flex">
                {/* Lijeva strana — animacija */}
                <div className="hidden lg:flex w-1/2 bg-[#0C4A6E] relative overflow-hidden flex-col items-center justify-center">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0C4A6E] via-[#0e5a82] to-[#1a3a5c]" />

                    {/* Floating emojis */}
                    {floatingItems.map((item, i) => (
                        <div
                            key={i}
                            className="floating absolute select-none"
                            style={item.style as React.CSSProperties}
                        >
                            {item.emoji}
                        </div>
                    ))}

                    {/* Logo — gore lijevo */}
                    <div className="absolute top-8 left-8 z-10">
                        <Link href={route('welcome')} className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-white/10 rounded-[10px] flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                            </div>
                            <span className="font-display text-[24px] font-extrabold text-white">RiGames</span>
                        </Link>
                    </div>

                    {/* Tekst — dolje desno */}
                    <div className="absolute bottom-10 left-8 z-10 text-left max-w-[512px]">
                        <h2 className="font-display text-[52px] font-extrabold text-white leading-tight mb-3">
                            Igraj se s ekipom.<br />Bilo kad,bilo gdje.
                        </h2>
                        <p className="text-sky-200 text-[16px] leading-relaxed">
                            Klasične društvene igre u browseru.<br />Bez instalacije, bez plaćanja.
                        </p>
                    </div>
                </div>

                {/* Scribble divider */}
                <div className="hidden lg:block relative z-20 -mx-6">
                    <svg width="48" height="100%" viewBox="0 0 48 900" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="h-screen w-12">
                        <path
                            d="M24 0 C18 60, 34 120, 22 180 C10 240, 36 300, 20 360 C8 420, 38 480, 18 540 C6 600, 34 660, 24 720 C14 780, 32 840, 24 900"
                            stroke="#FFFBF5"
                            strokeWidth="2.5"
                            fill="none"
                            strokeLinecap="round"
                        />
                        <path
                            d="M24 0 C30 80, 16 160, 28 240 C38 300, 12 380, 26 460 C36 520, 14 600, 28 680 C38 740, 16 820, 24 900"
                            stroke="white"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            opacity="0.3"
                        />
                    </svg>
                </div>

                {/* Desna strana — forma */}
                <div className="w-full lg:w-1/2 bg-[#FFFBF5] flex flex-col">
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
                                <h1 className="font-display text-[30px] font-extrabold text-stone-900 mb-2">Dobrodošao natrag</h1>
                                <p className="text-stone-500 text-[15px]">Prijavi se i nastavi igrati.</p>
                            </div>

                            {status && (
                                <div className="mb-4 text-sm font-medium text-green-600">{status}</div>
                            )}

                            <form onSubmit={submit} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-sm font-semibold text-stone-700">Email</label>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="username@email.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label htmlFor="password" className="text-sm font-semibold text-stone-700">Lozinka</label>
                                        {canResetPassword && (
                                            <Link href={route('password.request')} className="text-sm text-[#0C4A6E] hover:underline">
                                                Zaboravljena lozinka?
                                            </Link>
                                        )}
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0C4A6E] focus:border-transparent transition"
                                        placeholder="••••••••"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', (e.target.checked || false) as false)}
                                        className="w-4 h-4 rounded border-stone-300 text-[#0C4A6E] focus:ring-[#0C4A6E]"
                                    />
                                    <label htmlFor="remember" className="text-sm text-stone-500">Zapamti me</label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full py-3.5 rounded-xl bg-[#0C4A6E] text-[15px] font-semibold text-white hover:bg-[#083344] transition disabled:opacity-50 mt-2"
                                >
                                    {processing ? 'Prijava...' : 'Prijavi se'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 mt-6">
                                Nemaš račun?{' '}
                                <Link href={route('register')} className="font-semibold text-[#0C4A6E] hover:underline">
                                    Registriraj se
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
