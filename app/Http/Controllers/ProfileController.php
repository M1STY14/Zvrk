<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile with stats.
     */
    public function show(Request $request): Response
    {
        $user = $request->user()->load(['playerStats.game']);

        $stats = $user->playerStats->map(function ($stat) {
            return [
                'game' => $stat->game->name,
                'gamesPlayed' => $stat->games_played,
                'wins' => $stat->wins,
                'losses' => $stat->losses,
                'draws' => $stat->draws,
                'winRate' => $stat->games_played > 0 ? round(($stat->wins / $stat->games_played) * 100, 1) : 0,
            ];
        });

        $totalStats = [
            'gamesPlayed' => $user->playerStats->sum('games_played'),
            'wins' => $user->playerStats->sum('wins'),
            'losses' => $user->playerStats->sum('losses'),
            'draws' => $user->playerStats->sum('draws'),
        ];
        $totalStats['winRate'] = $totalStats['gamesPlayed'] > 0 ? round(($totalStats['wins'] / $totalStats['gamesPlayed']) * 100, 1) : 0;

        return Inertia::render('Profile/Show', [
            'user' => $user->only(['id', 'name', 'email', 'avatar', 'created_at']),
            'stats' => $stats,
            'totalStats' => $totalStats,
        ]);
    }

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
