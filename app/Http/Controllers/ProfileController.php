<?php

namespace App\Http\Controllers;

use App\Data\PlayerStatData;
use App\Http\Requests\ProfileDeleteRequest;
use App\Http\Requests\ProfileUpdateRequest;
use App\Models\PlayerStat;
use App\Models\User;
use Illuminate\Container\Attributes\CurrentUser;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function show(#[CurrentUser] User $user): Response
    {
        $user->load(['playerStats.game']);

        $stats = $user->playerStats->map(fn (PlayerStat $stat) => PlayerStatData::fromModel($stat));

        return Inertia::render('Profile/Show', [
            'user' => $user->only(['id', 'name', 'email', 'avatar', 'created_at']),
            'stats' => $stats,
            'totalStats' => [
                'gamesPlayed' => $user->totalGamesPlayed(),
                'wins' => $user->totalWins(),
                'losses' => $user->totalLosses(),
                'draws' => $user->totalDraws(),
                'winRate' => $user->overallWinRate(),
            ],
        ]);
    }

    public function edit(#[CurrentUser] User $user): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->update([
                'email_verified_at' => null,
            ]);
        }

        $user->save();

        return Redirect::route('profile.edit');
    }

    public function destroy(ProfileDeleteRequest $request, #[CurrentUser] User $user): RedirectResponse
    {
        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
