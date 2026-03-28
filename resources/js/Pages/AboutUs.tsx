import { Head, Link } from '@inertiajs/react';

const team = [
    { name: 'Antonio Filipović', role: 'nan' },
    { name: 'Nicole Ivanković', role: 'nan' },
    { name: 'Leo Kocijan', role: 'nan' },
    { name: 'Fran Krsto Pilić', role: 'nan' },
    { name: 'Barbara Radoš', role: 'nan' },
    { name: 'Antonio Veselić', role: 'nan' },
];

const tech = [
    { name: 'Laravel 12', desc: 'Backend framework' },
    { name: 'React 18', desc: 'Frontend UI' },
    { name: 'Inertia.js', desc: 'SPA bez API-ja' },
    { name: 'Laravel Reverb', desc: 'Real-time WebSockets' },
    { name: 'Tailwind CSS', desc: 'Stilizacija' },
    { name: 'TypeScript', desc: 'Tipiziran JavaScript' },
];

export default function AboutUs() {
    return (
        <>
            <Head title="O nama" />
            <div className="min-h-screen bg-[#FFFBF5]">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-20 h-[72px]">
                    <Link href={route('welcome')} className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-[#0C4A6E] rounded-[10px] flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="12" height="12" x="2" y="10" rx="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/></svg>
                        </div>
                        <span className="font-display text-[22px] font-extrabold text-stone-900">Zvrk</span>
                    </Link>

                    <div className="flex items-center gap-8">
                        <Link href={route('welcome') + '#igre'} className="text-[15px] font-medium text-stone-500 hover:text-stone-900 transition">Igre</Link>
                        <Link href={route('welcome') + '#kako-igrati'} className="text-[15px] font-medium text-stone-500 hover:text-stone-900 transition">Kako igrati</Link>
                        <Link href={route('about')} className="text-[15px] font-medium text-stone-900 transition">O nama</Link>
                    </div>

                    <div className="flex items-center gap-3">
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
                    </div>
                </nav>

                {/* Hero */}
                <section className="px-20 py-16">
                    <div className="flex items-center gap-1.5 bg-amber-100 rounded-full px-3.5 py-1.5 w-fit mb-6">
                        <span className="text-[13px]">&#9875;</span>
                        <span className="text-[13px] font-semibold text-amber-800">Napravljeno na RITEH-u, Rijeka</span>
                    </div>
                    <h1 className="font-display text-[52px] font-extrabold text-stone-900 leading-[1.15] mb-5">
                        O nama
                    </h1>
                    <p className="text-lg text-stone-500 leading-relaxed">
                        Zvrk je studentski projekt Tehničkog fakulteta u Rijeci (RITEH). Cilj nam je omogućiti igračima da igraju klasične društvene igre online,
                        s prijateljima, u stvarnom vremenu — bez instalacije i bez plaćanja.
                    </p>
                </section>

                {/* Tim */}
                <section className="bg-white px-20 py-16">
                    <div className="flex flex-col gap-2 mb-10">
                        <span className="text-xs font-bold text-orange-600 tracking-[2px]">TIM</span>
                        <h2 className="font-display text-4xl font-extrabold text-stone-900">6 developera, 1 cilj</h2>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {team.map((member) => (
                            <div key={member.name} className="bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col gap-2">
                                <div className="w-12 h-12 bg-[#0C4A6E] rounded-full flex items-center justify-center mb-2">
                                    <span className="text-white font-bold text-lg">{member.name[0]}</span>
                                </div>
                                <h3 className="font-display text-base font-bold text-stone-900">{member.name}</h3>
                                <p className="text-sm text-stone-400">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tech stack */}
                <section className="px-20 py-16">
                    <div className="flex flex-col gap-2 mb-10">
                        <span className="text-xs font-bold text-teal-600 tracking-[2px]">TEHNOLOGIJE</span>
                        <h2 className="font-display text-4xl font-extrabold text-stone-900">Sto koristimo</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {tech.map((t) => (
                            <div key={t.name} className="bg-white border border-stone-200 rounded-2xl p-6 flex flex-col gap-1">
                                <h3 className="font-display text-base font-bold text-stone-900">{t.name}</h3>
                                <p className="text-sm text-stone-400">{t.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="px-20 py-12">
                    <div className="bg-[#0C4A6E] rounded-3xl px-16 py-14 flex items-center justify-between">
                        <div className="flex flex-col gap-4 max-w-[560px]">
                            <h2 className="font-display text-[32px] font-extrabold text-white">Spreman za igru?</h2>
                            <p className="text-base text-sky-200 leading-relaxed max-w-[480px]">
                                Besplatno, bez reklama, samo cista zabava s ekipom.
                            </p>
                        </div>
                        <Link
                            href={route('register')}
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
                                <span className="font-display text-lg font-extrabold text-stone-900">Zvrk</span>
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
                                <Link href={route('about')}className="text-[13px] text-stone-400">O nama</Link>
                                <span className="text-[13px] text-stone-400">Ljestvica</span>
                                <span className="text-[13px] text-stone-400">GitHub</span>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-stone-200 pt-6 flex justify-center">
                        <span className="text-xs text-stone-400">{'\u00A9'} 2026 Zvrk. Sva prava pridrzana.</span>
                    </div>
                </footer>
            </div>
        </>
    );
}
