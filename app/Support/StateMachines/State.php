<?php

namespace App\Support\StateMachines;

use Asantibanez\LaravelEloquentStateMachines\Exceptions\TransitionNotAllowedException;
use Asantibanez\LaravelEloquentStateMachines\Models\PendingTransition;
use Asantibanez\LaravelEloquentStateMachines\Models\StateHistory;
use Asantibanez\LaravelEloquentStateMachines\StateMachines\State as BaseState;
use Carbon\Carbon;
use Override;

/**
 * Class State
 *
 * @property string $state
 * @property StateMachine $stateMachine
 */
final class State extends BaseState
{
    #[Override]
    public function state(): string
    {
        return $this->normalizeCasting($this->state);
    }

    #[Override]
    public function is($state): bool // @pest-ignore-type
    {
        return $this->state() === $this->normalizeCasting($state);
    }

    #[Override]
    public function canBe($state): bool // @pest-ignore-type
    {
        return $this->stateMachine->canBe($from = $this->state(), $to = $this->normalizeCasting($state));
    }

    public function normalizeCasting($state): mixed // @pest-ignore-type
    {
        return $this->stateMachine->normalizeCasting($state);
    }

    /**
     * @throws TransitionNotAllowedException
     */
    #[Override]
    public function transitionTo($state, $customProperties = [], $responsible = null): void // @pest-ignore-type
    {
        $this->stateMachine->transitionTo(
            from: $this->state(),
            to: $this->normalizeCasting($state),
            customProperties: $customProperties,
            responsible: $responsible
        );
    }

    /**
     * @throws TransitionNotAllowedException
     */
    #[Override]
    public function postponeTransitionTo($state, Carbon $when, $customProperties = [], $responsible = null): ?PendingTransition // @pest-ignore-type
    {
        return $this->stateMachine->postponeTransitionTo(
            from: $this->state(),
            to: $this->normalizeCasting($state),
            when: $when,
            customProperties: $customProperties,
            responsible: $responsible
        );
    }

    #[Override]
    public function latest(): ?StateHistory
    {
        return $this->snapshotWhen($this->state());
    }
}
