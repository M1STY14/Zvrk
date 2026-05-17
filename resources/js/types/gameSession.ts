/** Shared session player shape from GameSessionController / lobby pages. */
export type GameSessionPlayer = {
    id: string;
    user_id: string;
    player_number: number;
    is_connected: boolean;
    user: {
        id: string;
        name: string;
    };
};

export type GameSessionBase = {
    id: string;
    name: string;
    is_finished: boolean;
    players: GameSessionPlayer[];
    winner_user_id: string | null;
    game: {
        slug: string;
        name: string;
    };
};
