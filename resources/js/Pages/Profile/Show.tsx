import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';

interface UserData {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    created_at: string;
}

interface GameStat {
    game: string;
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
}

interface TotalStats {
    gamesPlayed: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
}

export default function Show({
    user,
    stats,
    totalStats,
}: PageProps<{ user: UserData; stats: GameStat[]; totalStats: TotalStats }>) {
    const memberSince = format(new Date(user.created_at), 'MMMM d, yyyy');

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Profile
                    </h2>
                    <Link
                        href={route('profile.edit')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-900"
                    >
                        Edit Profile
                    </Link>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {/* User Card */}
                    <div className="bg-white p-6 shadow sm:rounded-lg sm:p-8">
                        <div className="flex items-center space-x-6">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-4xl font-bold text-white">
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="h-full w-full rounded-full object-cover"
                                    />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">
                                    {user.name}
                                </h1>
                                <p className="text-gray-500">{user.email}</p>
                                <p className="mt-2 text-sm text-gray-400">
                                    Member since {memberSince}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Total Stats */}
                    <div className="bg-white shadow sm:rounded-lg sm:p-8">
                        <h2 className="mb-6 text-2xl font-bold text-gray-900">
                            Overall Statistics
                        </h2>
                        <div className="grid gap-4 md:grid-cols-5">
                            <StatCard
                                label="Games Played"
                                value={totalStats.gamesPlayed}
                                accentColor="blue"
                            />
                            <StatCard
                                label="Wins"
                                value={totalStats.wins}
                                accentColor="green"
                            />
                            <StatCard
                                label="Losses"
                                value={totalStats.losses}
                                accentColor="red"
                            />
                            <StatCard
                                label="Draws"
                                value={totalStats.draws}
                                accentColor="yellow"
                            />
                            <StatCard
                                label="Win Rate"
                                value={`${totalStats.winRate}%`}
                                accentColor="purple"
                            />
                        </div>
                    </div>

                    {/* Game Stats */}
                    {stats.length > 0 ? (
                        <div className="bg-white shadow sm:rounded-lg sm:p-8">
                            <h2 className="mb-6 text-2xl font-bold text-gray-900">
                                Game Statistics
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-gray-200 bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Game
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                                Played
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-green-600">
                                                Wins
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-red-600">
                                                Losses
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-yellow-600">
                                                Draws
                                            </th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-purple-600">
                                                Win Rate
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.map((stat, index) => (
                                            <tr
                                                key={index}
                                                className="hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {stat.game}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-600">
                                                    {stat.gamesPlayed}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-green-600">
                                                    {stat.wins}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-red-600">
                                                    {stat.losses}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-yellow-600">
                                                    {stat.draws}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-semibold text-purple-600">
                                                    {stat.winRate}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-lg bg-white p-8 text-center shadow">
                            <p className="text-gray-500">
                                No game statistics available yet. Start playing to
                                see your stats!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

interface StatCardProps {
    label: string;
    value: string | number;
    accentColor: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

function StatCard({ label, value, accentColor }: StatCardProps) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        red: 'bg-red-50 border-red-200 text-red-600',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600',
    };

    return (
        <div
            className={`rounded-lg border-2 p-4 ${colorClasses[accentColor]}`}
        >
            <p className="text-sm font-medium opacity-75">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
        </div>
    );
}
