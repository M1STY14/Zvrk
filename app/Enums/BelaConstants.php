<?php

namespace App\Enums;

/**
 * Constants for Bela game array keys and values.
 */
final class BelaConstants
{
    // Trick entry keys
    public const TRICK_PLAYER = 'player';

    public const TRICK_CARD = 'card';

    // Trick history entry keys
    public const TRICK_HISTORY_PLAYS = 'plays';

    public const TRICK_HISTORY_WINNER = 'winner';

    public const TRICK_HISTORY_POINTS = 'points';

    // Declaration keys
    public const DECLARATION_TEAM_ONE = 'team1';

    public const DECLARATION_TEAM_TWO = 'team2';

    public const DECLARATION_DETAILS = 'details';

    // Bid values
    public const BID_PASS = 'pass';

    // Declaration sequence lengths and points
    public const SEQUENCE_LENGTH_3 = 3;

    public const SEQUENCE_LENGTH_4 = 4;

    public const SEQUENCE_LENGTH_5_TO_8 = 5;

    public const SEQUENCE_POINTS_3 = 20;

    public const SEQUENCE_POINTS_4 = 50;

    public const SEQUENCE_POINTS_5_TO_8 = 100;

    // Four-of-a-kind declaration points
    public const FOUR_OF_A_KIND_JACK = 200;

    public const FOUR_OF_A_KIND_NINE = 150;

    public const FOUR_OF_A_KIND_DEFAULT = 100;

    // Last trick bonus
    public const LAST_TRICK_BONUS = 10;

    // Game constraints
    public const TEAM_ONE = [1, 3];

    public const TEAM_TWO = [2, 4];

    public const PLAYER_NUMBERS = [1, 2, 3, 4];

    public const PLAYER_COUNT = 4;

    public const INITIAL_DEALER = 4;

    public const VISIBLE_CARDS_PER_PLAYER = 6;

    public const HIDDEN_CARDS_PER_PLAYER = 2;

    public const CARDS_PER_RANK = 4;

    public const WINNING_SCORE = 1001;
}
