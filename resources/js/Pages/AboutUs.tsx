import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';

function ZvrkModel() {
    const { scene } = useGLTF('/models/about_us_page_model_lower_32MB.glb');

    return <primitive object={scene} scale={3} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

const team = [
    { name: 'Antonio Filipović', role: 'Frontend/Backend', photo: '/images/about_us_team_profiles/team_profile_Antonio.svg' },
    { name: 'Nicole Ivanković', role: 'Frontend', photo: '/images/about_us_team_profiles/team_profile_Nicole.svg' },
    { name: 'Leo Kocijan', role: 'Backend', photo: '/images/about_us_team_profiles/team_profile_Leo.svg' },
    { name: 'Fran Krsto Pilić', role: 'Frontend', photo: '/images/about_us_team_profiles/team_profile_Fran.svg' },
    { name: 'Barbara Radoš', role: 'Backend', photo: '/images/about_us_team_profiles/team_profile_Barbara.svg' },
    { name: 'Antonio Veselić', role: 'Frontend/Backend', photo: '/images/about_us_team_profiles/team_profile_Antonio2.svg' },
];

const tech = [
    { name: 'Laravel 12', desc: 'Backend framework' },
    { name: 'React 18', desc: 'Frontend UI' },
    { name: 'Inertia.js', desc: 'SPA bez API-ja' },
    { name: 'Laravel Reverb', desc: 'Real-time WebSockets' },
    { name: 'Tailwind CSS', desc: 'Stilizacija' },
    { name: 'TypeScript', desc: 'Tipiziran JavaScript' },
];

const footerGames = ['Tic-Tac-Toe', 'Čovječe ne ljuti se', 'Dama', '4 u nizu', 'Potapanje brodova', 'Uno', 'Bela', 'Snaps'];

export default function AboutUs({ auth }: PageProps) {
    return (
        <>
            <Head title="O nama" />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&display=swap');
            `}</style>

            <div className="min-h-screen" style={{ backgroundColor: '#f9f9fb', color: '#2f3336', fontFamily: 'Manrope, sans-serif' }}>

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
                            <Link href={route('about')} className="text-base font-semibold" style={{ color: '#005bc2' }}>
                                O nama
                            </Link>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            {auth.user ? (
                                <Link href={route('dashboard')}
                                    className="px-6 py-2 rounded-full text-base font-bold transition-colors"
                                    style={{ color: '#005bc2' }}>
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link href={route('login')}
                                        className="px-6 py-2 rounded-full text-base font-bold transition-all"
                                        style={{ color: '#FA532F' }}>
                                        Prijava
                                    </Link>
                                    <Link href={route('register')}
                                        className="px-6 py-2 rounded-full text-base font-bold text-white transition-all"
                                        style={{ background: '#18181b' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#FA532F'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#18181b'; }}>
                                        Registracija
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <div className="pt-28">
                    {/* Hero */}
                    <section className="max-w-screen-xl mx-auto px-8 py-16">
                        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-8">
                            <div>
                                <div className="relative inline-flex items-center gap-2 px-8 py-5 mb-6 text-base font-semibold overflow-hidden"
                                    style={{ color: '#FA532F' }}>
                                    <img src="/images/about_us_small_bg.svg" alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: 'fill' }} />
                                    <span className="relative">♠️  Napravljeno na RITEH-u, Rijeka</span>
                                </div>
                                <h1 className="font-black tracking-tight leading-none mb-5"
                                    style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', color: '#2f3336' }}>
                                    O nama
                                </h1>
                                <p className="text-lg leading-relaxed max-w-2xl" style={{ color: '#5c5f63' }}>
                                    Zvrk je studentski projekt Tehničkog fakulteta u Rijeci (RITEH). Cilj nam je omogućiti igračima da igraju klasične društvene igre online,
                                    s prijateljima, u stvarnom vremenu — bez instalacije i bez plaćanja.
                                </p>
                            </div>

                            <div className="h-[600px] w-full">
                                <Canvas shadows={false} camera={{ position: [19, 19, -90], fov: 45 }} style={{ background: 'transparent' }}>
                                    <Suspense fallback={null}>
                                        <Stage environment="sunset" intensity={0.6} shadows={false}>
                                            <ZvrkModel />
                                        </Stage>
                                        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
                                    </Suspense>
                                </Canvas>
                            </div>
                        </div>
                    </section>

                    {/* Tim */}
                    <section className="py-16" style={{ backgroundColor: '#ffffff' }}>
                        <div className="max-w-screen-xl mx-auto px-8">
                            <div className="mb-10">
                                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FA532F' }}>TIM</span>
                                <h2 className="font-black text-4xl tracking-tight mt-2" style={{ color: '#2f3336' }}>6 developera, 1 cilj</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {team.map((member) => (
                                    <div key={member.name} className="rounded-2xl p-6 flex flex-col gap-2 border"
                                        style={{ backgroundColor: '#f9f9fb', borderColor: '#eceef1' }}>
                                        <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-full mb-2 object-cover" />
                                        <h3 className="font-bold text-base" style={{ color: '#2f3336' }}>{member.name}</h3>
                                        <p className="text-sm" style={{ color: '#94a3b8' }}>{member.role}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Tech stack */}
                    <section className="py-16">
                        <div className="max-w-screen-xl mx-auto px-8">
                            <div className="mb-10">
                                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#72D660' }}>TEHNOLOGIJE</span>
                                <h2 className="font-black text-4xl tracking-tight mt-2" style={{ color: '#2f3336' }}>Što koristimo</h2>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {tech.map((t) => (
                                    <div key={t.name} className="rounded-2xl p-6 flex flex-col gap-1 border"
                                        style={{ backgroundColor: '#ffffff', borderColor: '#eceef1' }}>
                                        <h3 className="font-bold text-base" style={{ color: '#2f3336' }}>{t.name}</h3>
                                        <p className="text-sm" style={{ color: '#94a3b8' }}>{t.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* CTA */}
                    <section className="max-w-screen-xl mx-auto px-8 py-12">
                        <div className="rounded-3xl px-16 py-14 flex items-center justify-between"
                            style={{ backgroundColor: '#18181b' }}>
                            <div className="max-w-lg">
                                <h2 className="font-black text-3xl text-white mb-4">Spreman za igru?</h2>
                                <p className="text-base leading-relaxed" style={{ color: '#94a3b8' }}>
                                    Besplatno, bez reklama, samo čista zabava s ekipom.
                                </p>
                            </div>
                            <Link href={auth.user ? route('dashboard') : route('register')}
                                className="px-8 py-4 rounded-full font-bold text-white text-base transition-all shrink-0"
                                style={{ backgroundColor: '#FA532F' }}
                                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#005bc2'; }}
                                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#FA532F'; }}>
                                {auth.user ? 'Igraj odmah' : 'Registriraj se'} →
                            </Link>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="border-t" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                        <div className="flex flex-col md:flex-row justify-between items-start px-12 py-12 max-w-screen-xl mx-auto">
                            <div className="mb-8 md:mb-0">
                                <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" />
                                <p className="text-sm max-w-xs mt-2" style={{ color: '#64748b' }}>Studentski projekt @ RITEH, Rijeka.</p>
                                <p className="text-xs mt-4" style={{ color: '#94a3b8' }}>© 2026 Zvrk. Sva prava pridržana.</p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#2f3336' }}>Igre</h4>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                    {[footerGames.slice(0, 4), footerGames.slice(4, 8)].map((col, ci) => (
                                        <div key={ci} className="flex flex-col gap-2">
                                            {col.map(g => (
                                                <span key={g} className="text-sm font-medium" style={{ color: '#64748b' }}>{g}</span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 md:mt-0 flex flex-col gap-2">
                                <h4 className="text-sm font-bold uppercase tracking-wide mb-1" style={{ color: '#2f3336' }}>Platforme</h4>
                                <Link href={route('about')} className="text-sm font-medium" style={{ color: '#64748b' }}>O nama</Link>
                                <a href="#" className="text-sm font-medium" style={{ color: '#64748b' }}>Ljestvica</a>
                                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium" style={{ color: '#64748b' }}>GitHub</a>
                                <Link href={route('login')} className="text-sm font-medium" style={{ color: '#64748b' }}>Prijava</Link>
                                <Link href={route('register')} className="text-sm font-medium" style={{ color: '#64748b' }}>Registracija</Link>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </>
    );
}
