import GameOverModal from '@/Components/Game/GameOverModal';
import OpponentDisconnectedBanner from '@/Components/Game/OpponentDisconnectedBanner';
import PlayerInfo from '@/Components/Game/PlayerInfo';
import GameBoardWrapper from '@/GameBoards/GameBoardWrapper';
import { BelaState } from '@/GameBoards/BelaBoard';
import { useGameChannel } from '@/hooks/useGameChannel';
import type { GameSessionBase } from '@/types/gameSession';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

type SessionProp = GameSessionBase & {
    state: BelaState | null;
};

type Props = PageProps<{ session: SessionProp }>;

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function postMove(sessionId: string, moveData: Record<string, unknown>): Promise<Response> {
    const socketId = window.Echo?.socketId?.();
    return fetch(route('game.move', sessionId), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
            ...(socketId ? { 'X-Socket-ID': socketId } : {}),
        },
        body: JSON.stringify({ move_data: moveData }),
    });
}

export default function BelaPlay({ auth, session }: Props) {
    const isFinished = session.is_finished;
    const [belaState, setBelaState] = useState<BelaState | null>(session.state);
    const [winner, setWinner] = useState<string | null>(
        session.winner_user_id
            ? session.players.find((p) => p.user.id === session.winner_user_id)?.user.name ?? null
            : null,
    );
    const [gameOver, setGameOver] = useState(isFinished);
    const [showGameOver, setShowGameOver] = useState(isFinished);

    const playerNames = useMemo(
        () =>
            session.players.reduce<Record<string, string>>((acc, player) => {
                acc[player.player_number] = player.user.name;
                return acc;
            }, {}),
        [session.players],
    );

    const myPlayer = session.players.find(
        (player) => String(player.user.id) === String(auth.user.id),
    );
    const playerNumber = myPlayer?.player_number ?? null;

    const isYourTurn =
        belaState !== null &&
        !gameOver &&
        playerNumber !== null &&
        belaState.currentTurn === playerNumber;

    const getWinningTeamName = (teamScores: [number, number]): string => {
        return teamScores[0] > teamScores[1] ? 'Tim 1' : 'Tim 2';
    };

    const { disconnectedUserIds, showOpponentDisconnectedBanner, usePluralDisconnectMessage } =
        useGameChannel<BelaState>(
            session.id,
            { players: session.players, currentUserId: auth.user.id, gameOver },
            {
                onMoveMade: (event) => {
                    setBelaState(event.state);
                },
                onGameEnded: (event) => {
                    const winnerName = event.state?.teamScores
                        ? getWinningTeamName(event.state.teamScores)
                        : event.winner
                        ? playerNames[event.winner] ?? null
                        : null;
                    setWinner(winnerName);
                    setGameOver(true);
                    setShowGameOver(true);
                    setBelaState(event.state);
                },
                onGameStarted: (event) => {
                    setBelaState(event.state);
                },
            },
        );

    const displayPlayers = useMemo(
        () =>
            [...session.players]
                .sort((a, b) => a.player_number - b.player_number)
                .map((player) => ({
                    id: player.user.id,
                    name: player.user.name,
                    player_number: player.player_number,
                    mark: ['♣', '♦', '♥', '♠'][player.player_number - 1] ?? '',
                    isConnected: !disconnectedUserIds.has(player.user.id),
                })),
        [disconnectedUserIds, session.players],
    );

    const handleBid = async (suit?: string, pass?: boolean) => {
        if (!isYourTurn || belaState === null) {
            return;
        }

        const response = await postMove(session.id, {
            type: 'bid',
            suit: suit ?? null,
            pass: pass ?? false,
        });

        if (!response.ok) {
            return;
        }

        const data: { state: BelaState; game_over: boolean; result: { winner: string | null; draw: boolean } | null } =
            await response.json();

        setBelaState(data.state);

        if (data.game_over && data.result) {
            setWinner(data.state.teamScores ? getWinningTeamName(data.state.teamScores) : data.result.winner ? playerNames[data.result.winner] ?? null : null);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handlePlay = async (card: string) => {
        if (!isYourTurn || belaState === null) {
            return;
        }

        const response = await postMove(session.id, {
            type: 'play',
            card,
        });

        if (!response.ok) {
            return;
        }

        const data: { state: BelaState; game_over: boolean; result: { winner: string | null; draw: boolean } | null } =
            await response.json();

        setBelaState(data.state);

        if (data.game_over && data.result) {
            setWinner(data.result.winner ? playerNames[data.result.winner] ?? null : null);
            setGameOver(true);
            setShowGameOver(true);
        }
    };

    const handleLeave = () => {
        setShowGameOver(false);
        router.post(route('game.leave', session.id));
    };

    if (!belaState) {
        return (
            <>
                <Head title={`${session.game.name} — ${session.name}`} />
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <p className="text-slate-500">Čekanje na početak igre...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${session.game.name} — ${session.name}`} />

            <div className="min-h-screen bg-slate-50 text-slate-900 px-6 py-8">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight">{session.game.name}</h1>
                            <p className="mt-1 text-sm text-slate-500">{session.name}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={route('lobby.index', session.game.slug)}
                                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                            >
                                Natrag u predvorje
                            </Link>
                            <button
                                type="button"
                                onClick={handleLeave}
                                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                            >
                                Napusti igru
                            </button>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                        <OpponentDisconnectedBanner
                            show={showOpponentDisconnectedBanner}
                            multiple={usePluralDisconnectMessage}
                        />

                        <GameBoardWrapper
                            gameSlug="bela"
                            belaState={belaState}
                            playerNumber={playerNumber}
                            isYourTurn={isYourTurn}
                            disabled={gameOver}
                            onBid={handleBid}
                            onPlay={handlePlay}
                            playerNames={playerNames}
                        />

                        <div className="mt-8">
                            <PlayerInfo
                                players={displayPlayers}
                                currentPlayerId={belaState?.players[String(belaState.currentTurn)] ?? null}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <GameOverModal
                show={showGameOver}
                winnerName={winner}
                draw={false}
                onLeave={handleLeave}
            />
        </>
    );
}