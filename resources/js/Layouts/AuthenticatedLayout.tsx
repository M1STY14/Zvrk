import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    return (
        <div className="min-h-screen" style={{ backgroundColor: '#f9f9fb' }}>

            {/* Navbar — isti stil kao Welcome page */}
            <header id="main-nav" className="fixed top-0 w-full z-50 border-b" style={{ backgroundColor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', borderColor: '#eceef1' }}>
                <nav className="grid grid-cols-3 items-center px-8 py-4 max-w-screen-xl mx-auto">

                    {/* Logo */}
                    <div>
                        <Link href="/">
                            <img src="/images/zvrk_navbar_logo.png" alt="Zvrk" className="h-16 w-auto" />
                        </Link>
                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-500 transition duration-150 ease-in-out hover:text-gray-700 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.show')}
                                        >
                                            View Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            Edit Profile
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 transition duration-150 ease-in-out hover:bg-gray-100 hover:text-gray-500 focus:bg-gray-100 focus:text-gray-500 focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Center links */}
                    <div className="hidden md:flex items-center justify-center gap-10">
                        <Link href={route('dashboard')} className="text-base font-semibold transition-colors" style={{ color: '#64748b' }}
                            onMouseOver={e => (e.currentTarget.style.color = '#005bc2')}
                            onMouseOut={e => (e.currentTarget.style.color = '#64748b')}>
                            Dashboard
                        </Link>
                    </div>

                    {/* User dropdown */}
                    <div className="flex items-center justify-end gap-3">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="px-4 py-1.5 rounded-full text-sm font-bold text-white transition-all"
                                    style={{ background: '#18181b' }}
                                    onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#005bc2'; }}
                                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = '#18181b'; }}
                                >
                                    {user.name}
                                    <svg className="inline-block ms-2 -me-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.show')}>
                                    View Profile
                                </Dropdown.Link>
                                <Dropdown.Link href={route('profile.edit')}>
                                    Edit Profile
                                </Dropdown.Link>
                                <Dropdown.Link
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>

                </nav>
            </header>

            {header && (
                <div className="pt-28">
                    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </div>
            )}

            <main className={header ? '' : 'pt-28'}>{children}</main>
        </div>
    );
}
