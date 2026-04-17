import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface Game {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    is_active: boolean;
    min_players: number;
    max_players: number;
    active_players: number;
    user_games_played: number;
    user_wins: number;
}

interface UserStats {
    totalGamesPlayed: number;
    overallWinRate: number;
}

interface Props {
    games: Game[];
    userStats: UserStats;
}

export default function Dashboard({ games, userStats }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Game Catalog
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-4">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* User Stats Section */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-8">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Games Played</p>
                                    <p className="text-4xl font-bold mt-2">{userStats.totalGamesPlayed}</p>
                                </div>
                                <div className="text-5xl opacity-75">⚡</div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 shadow-lg rounded-lg p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Win Rate</p>
                                    <p className="text-4xl font-bold mt-2">{userStats.overallWinRate}%</p>
                                </div>
                                <div className="text-5xl opacity-75">🏆</div>
                            </div>
                        </div>
                    </div>

                    {/* Games Grid Section */}
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Games</h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
                            {/* Tic-Tac-Toe */}
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-indigo-200 relative overflow-hidden">
                                {/* Card corner decoration */}
                                <div className="absolute bottom-2 right-2 text-3xl">❌⭕</div>
                                
                                <h4 className="text-xl font-bold text-indigo-900 mb-2">Tic-Tac-Toe</h4>
                                <div className="h-1 w-12 bg-indigo-400 rounded mb-3"></div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                                    Naizmjenično postavi X i O na mrežu 3x3. Poredaj tri u niz i pobijedi!
                                </p>
                                <div className="border-t border-indigo-300 pt-3 mt-4">
                                    <p className="text-sm font-semibold text-indigo-800">👥 Players: 2v2</p>
                                </div>
                            </div>

                            {/* Ludo */}
                            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-yellow-200 relative overflow-hidden opacity-70">
                                {/* Card corner decoration */}
                                <div className="absolute bottom-2 right-2 text-3xl">🎲</div>
                                
                                <h4 className="text-xl font-bold text-yellow-900 mb-2">Ludo</h4>
                                <div className="h-1 w-12 bg-yellow-400 rounded mb-3"></div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                                   Baci kockicu i utrči se sa svoja četiri žetona od starta do cilja. Blokiraj i zarobi protivnike!
                                </p>
                                <div className="border-t border-yellow-300 pt-3 mt-4">
                                    <p className="text-sm font-semibold text-yellow-800">👥 Players: 2-4</p>
                                </div>
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                        COMING SOON
                                    </span>
                                </div>
                            </div>

                            {/* Checkers */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-300 relative overflow-hidden opacity-70">
                                {/* Card corner decoration */}
                                <div className="absolute bottom-2 right-2 text-3xl">♟️</div>
                                
                                <h4 className="text-xl font-bold text-gray-800 mb-2">Checkers</h4>
                                <div className="h-1 w-12 bg-gray-400 rounded mb-3"></div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                                    Pomakni figure dijagonalno i preskaći protivnike kako bi ih zarobili. Postani kralj ili kraljica!
                                </p>
                                <div className="border-t border-gray-300 pt-3 mt-4">
                                    <p className="text-sm font-semibold text-gray-700">👥 Players: 2v2</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                        COMING SOON
                                    </span>
                                </div>
                            </div>

                            {/* 4 in a Row */}
                            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-red-200 relative overflow-hidden opacity-70">
                                {/* Card corner decoration */}
                                <div className="absolute bottom-2 right-2 text-3xl">🔴</div>
                                
                                <h4 className="text-xl font-bold text-red-900 mb-2">4 in a Row</h4>
                                <div className="h-1 w-12 bg-red-400 rounded mb-3"></div>
                                <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                                    Spusti obojene žetone u vertikalnu mrežu i budi pametniji od protivnika. Spoji četiri u niz i pobijedi!
                                </p>
                                <div className="border-t border-red-300 pt-3 mt-4">
                                    <p className="text-sm font-semibold text-red-800">👥 Players: 2v2</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">
                                        COMING SOON
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Games Catalog Section */}
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Game Catalog</h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {games.map((game) => (
                                <Link
                                    key={game.id}
                                    href={game.is_active ? route('lobby.index', { game: game.slug }) : '#'}
                                    className={`group overflow-hidden bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 flex flex-col ${
                                        game.is_active ? 'cursor-pointer' : 'cursor-not-allowed'
                                    } ${!game.is_active ? 'opacity-60' : ''}`}
                                    as={game.is_active ? 'a' : 'div'}
                                >
                                    {/* Game Image */}
                                    <div className="relative overflow-hidden bg-gray-200 h-48">
                                        {game.image ? (
                                            <img
                                                src={game.image}
                                                alt={game.name}
                                                className={`w-full h-full object-cover transition-transform duration-300 ${
                                                    game.is_active ? 'group-hover:scale-105' : ''
                                                }`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400">
                                                <span className="text-gray-500 text-sm">No image</span>
                                            </div>
                                        )}

                                        {/* Coming Soon Badge */}
                                        {!game.is_active && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                                                <span className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold text-sm">
                                                    Coming Soon
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Game Content */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                            {game.name}
                                        </h4>

                                        {game.description && (
                                            <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-2">
                                                {game.description}
                                            </p>
                                        )}

                                        {/* Player Count and Online Status */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center text-gray-700 text-sm">
                                                <span className="mr-2">👥</span>
                                                <span>{game.min_players}-{game.max_players} players</span>
                                            </div>
                                            {game.active_players > 0 && (
                                                <div className="flex items-center text-green-600 font-semibold text-sm bg-green-50 px-3 py-1 rounded-full">
                                                    <span className="inline-block w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                                                    {game.active_players} online
                                                </div>
                                            )}
                                        </div>

                                        {/* User Stats for this Game */}
                                        {game.user_games_played > 0 && (
                                            <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
                                                <p>
                                                    Your record: <span className="font-semibold text-gray-900">{game.user_wins}W / {game.user_games_played - game.user_wins}L</span>
                                                </p>
                                            </div>
                                        )}

                                        {/* Play Button */}
                                        {game.is_active && (
                                            <button className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200">
                                                Play Now
                                            </button>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
