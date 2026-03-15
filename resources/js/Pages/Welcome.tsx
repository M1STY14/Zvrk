import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

const games = [
    { name: 'Tic-Tac-Toe', desc: 'Brza partija, 2 igraca', players: '2P', color: 'bg-green-100 text-green-800' },
    { name: 'Covjece ne ljuti se', desc: 'Utrka do cilja', players: '2-4P', color: 'bg-blue-100 text-blue-800' },
    { name: 'Dama', desc: 'Preskoci i osvoji', players: '2P', color: 'bg-green-100 text-green-800' },
    { name: '4 u nizu', desc: 'Spusti i pobijedi', players: '2P', color: 'bg-green-100 text-green-800' },
    { name: 'Potapanje brodova', desc: 'Potopi protivnicku flotu', players: '2P', color: 'bg-green-100 text-green-800' },
    { name: 'Uno', desc: 'Boje, brojevi, kaos!', players: '2-6P', color: 'bg-amber-100 text-amber-800' },
    { name: 'Bela', desc: 'Hrvatski klasik', players: '4P', color: 'bg-purple-100 text-purple-800' },
    { name: 'Snaps', desc: 'Tko je brzi?', players: '2-4P', color: 'bg-blue-100 text-blue-800' },
];

const steps = [
    { num: '1', title: 'Napravi racun', desc: 'Registriraj se u par sekundi. Samo email i lozinka — gotovo.', numBg: 'bg-orange-50', numColor: 'text-orange-600' },
    { num: '2', title: 'Udji u sobu', desc: 'Kreiraj novu sobu ili se pridruzi postojecoj. Pozovi ekipu preko linka.', numBg: 'bg-emerald-50', numColor: 'text-emerald-600' },
    { num: '3', title: 'Igraj i pobijedi!', desc: 'Natjeci se uzivo, prati statistiku i popni se na ljestvicu.', numBg: 'bg-blue-50', numColor: 'text-blue-600' },
];

export default function Welcome({
    auth,
}: PageProps) {
    return (
        <>
            <Head title="Pocetna" />
            <div className="min-h-screen bg-[#FFFBF5]">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-20 h-[72px]">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-[#0C4A6E] rounded-[10px] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                        </div>
                        <span className="font-display text-[22px] font-extrabold text-stone-900">RiGames</span>
                    </div>

                    <div className="flex items-center gap-8">
                        <a href="#igre" className="text-[15px] font-medium text-stone-500 hover:text-stone-900 transition">Igre</a>
                        <a href="#kako-igrati" className="text-[15px] font-medium text-stone-500 hover:text-stone-900 transition">Kako igrati</a>
                        <a href="#o-nama" className="text-[15px] font-medium text-stone-500 hover:text-stone-900 transition">O nama</a>
                    </div>

                    <div className="flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="px-5 py-2.5 rounded-[10px] bg-[#0C4A6E] text-sm font-semibold text-white hover:bg-[#083344] transition"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="px-5 py-2.5 rounded-[10px] text-sm font-semibold text-stone-900 hover:bg-stone-100 transition"
                                >
                                    Prijava
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="px-5 py-2.5 rounded-[10px] bg-[#0C4A6E] text-sm font-semibold text-white hover:bg-[#083344] transition"
                                >
                                    Registracija
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Hero */}
                <section className="flex items-center justify-between px-20 py-20">
                    <div className="flex flex-col gap-7 max-w-[560px]">
                        <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3.5 py-1.5 w-fit">
                            <span className="text-[13px]">{'\u2693'}</span>
                            <span className="text-[13px] font-semibold text-amber-800">Napravljeno na RITEH-u, Rijeka</span>
                        </div>

                        <h1 className="font-display text-[52px] font-extrabold text-stone-900 leading-[1.15]">
                            Igraj se s ekipom.<br />Bilo kad, bilo gdje.
                        </h1>

                        <p className="text-lg text-stone-500 leading-relaxed max-w-[480px]">
                            Klasicne drustvene igre u browseru. Pozovi prijatelje, udji u sobu i igraj uzivo — bez instalacije.
                        </p>

                        <div className="flex items-center gap-3.5">
                            <Link
                                href={auth.user ? route('dashboard') : route('register')}
                                className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-600 text-[15px] font-semibold text-white hover:bg-orange-700 transition"
                            >
                                Pocni igrati
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </Link>
                            <a
                                href="#igre"
                                className="px-7 py-3.5 rounded-xl border-[1.5px] border-stone-300 text-[15px] font-semibold text-stone-600 hover:bg-stone-50 transition"
                            >
                                Pregledaj igre
                            </a>
                        </div>
                    </div>

                    <div className="w-[520px] h-[420px] rounded-[28px] bg-gradient-to-br from-sky-100 to-amber-100 overflow-hidden flex items-center justify-center">
                        <div className="text-center p-12">
                            <div className="text-6xl mb-4">{'\uD83C\uDFB2\uD83C\uDCCF\u265F\uFE0F\uD83C\uDFAF'}</div>
                            <p className="font-display text-2xl font-bold text-stone-700 mt-4">Drustvene igre online</p>
                            <p className="text-stone-500 mt-2">S prijateljima, u stvarnom vremenu</p>
                        </div>
                    </div>
                </section>

                {/* Games */}
                <section id="igre" className="bg-white px-20 py-16">
                    <div className="flex items-end justify-between mb-10">
                        <div className="flex flex-col gap-2">
                            <span className="text-xs font-bold text-orange-600 tracking-[2px]">IGRE</span>
                            <h2 className="font-display text-4xl font-extrabold text-stone-900">Izaberi svoju igru</h2>
                        </div>
                        <span className="text-[15px] text-stone-400">8 igara za svaku priliku</span>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {games.map((game) => (
                            <div key={game.name} className="bg-stone-100 rounded-2xl overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                                <div className="h-[170px] bg-stone-200 flex items-center justify-center">
                                    <span className="text-5xl opacity-60 group-hover:scale-110 transition-transform">
                                        {game.name === 'Tic-Tac-Toe' && '\u274C\u2B55'}
                                        {game.name === 'Covjece ne ljuti se' && '\uD83C\uDFB2'}
                                        {game.name === 'Dama' && '\u26C0'}
                                        {game.name === '4 u nizu' && '\uD83D\uDD34\uD83D\uDFE1'}
                                        {game.name === 'Potapanje brodova' && '\uD83D\uDEA2'}
                                        {game.name === 'Uno' && '\uD83C\uDCCF'}
                                        {game.name === 'Bela' && '\u2660\u2665'}
                                        {game.name === 'Snaps' && '\u26A1'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-4 py-3.5">
                                    <div>
                                        <h3 className="font-display text-base font-bold text-stone-900">{game.name}</h3>
                                        <p className="text-xs text-stone-400">{game.desc}</p>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${game.color}`}>
                                        {game.players}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How It Works */}
                <section id="kako-igrati" className="bg-[#FFFBF5] px-20 py-16">
                    <div className="flex flex-col gap-2 mb-12">
                        <span className="text-xs font-bold text-teal-600 tracking-[2px]">KAKO IGRATI</span>
                        <h2 className="font-display text-4xl font-extrabold text-stone-900">Tri koraka do igre</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        {steps.map((step) => (
                            <div key={step.num} className="bg-white rounded-2xl border border-stone-200 p-7 flex flex-col gap-4">
                                <div className={`w-10 h-10 rounded-[10px] ${step.numBg} flex items-center justify-center`}>
                                    <span className={`font-display text-lg font-extrabold ${step.numColor}`}>{step.num}</span>
                                </div>
                                <h3 className="font-display text-lg font-bold text-stone-900">{step.title}</h3>
                                <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section id="o-nama" className="px-20 py-12">
                    <div className="bg-[#0C4A6E] rounded-3xl px-16 py-14 flex items-center justify-between">
                        <div className="flex flex-col gap-4 max-w-[560px]">
                            <h2 className="font-display text-[32px] font-extrabold text-white">Spreman za igru?</h2>
                            <p className="text-base text-sky-200 leading-relaxed max-w-[480px]">
                                Projekt studenata RITEH-a iz Rijeke. Besplatno, bez reklama, samo cista zabava s ekipom.
                            </p>
                        </div>
                        <Link
                            href={auth.user ? route('dashboard') : route('register')}
                            className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-orange-600 text-[15px] font-semibold text-white hover:bg-orange-700 transition shrink-0"
                        >
                            Registriraj se
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </Link>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-stone-50 border-t border-stone-200 px-20 pt-10 pb-8">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-[#0C4A6E] rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                                </div>
                                <span className="font-display text-lg font-extrabold text-stone-900">RiGames</span>
                            </div>
                            <p className="text-[13px] text-stone-400">Studentski projekt @ RITEH, Rijeka</p>
                        </div>

                        <div className="flex gap-14">
                            <div className="flex flex-col gap-2.5">
                                <span className="text-[13px] font-semibold text-stone-600">Igre</span>
                                <span className="text-[13px] text-stone-400">Tic-Tac-Toe</span>
                                <span className="text-[13px] text-stone-400">Ludo</span>
                                <span className="text-[13px] text-stone-400">Dama</span>
                                <span className="text-[13px] text-stone-400">4 u nizu</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <span className="text-[13px] font-semibold text-stone-600">Vise igara</span>
                                <span className="text-[13px] text-stone-400">Potapanje brodova</span>
                                <span className="text-[13px] text-stone-400">Uno</span>
                                <span className="text-[13px] text-stone-400">Bela</span>
                                <span className="text-[13px] text-stone-400">Snaps</span>
                            </div>
                            <div className="flex flex-col gap-2.5">
                                <span className="text-[13px] font-semibold text-stone-600">Platforma</span>
                                <span className="text-[13px] text-stone-400">O nama</span>
                                <span className="text-[13px] text-stone-400">Ljestvica</span>
                                <span className="text-[13px] text-stone-400">GitHub</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-stone-200 pt-6 flex justify-center">
                        <span className="text-xs text-stone-400">{'\u00A9'} 2026 RiGames. Sva prava pridrzana.</span>
                    </div>
                </footer>
            </div>
        </>
    );
}
