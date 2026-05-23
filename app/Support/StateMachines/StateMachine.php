<?php

namespace App\Support\StateMachines;

use Asantibanez\LaravelEloquentStateMachines\Exceptions\TransitionNotAllowedException;
use Asantibanez\LaravelEloquentStateMachines\Models\PendingTransition;
use Asantibanez\LaravelEloquentStateMachines\StateMachines\StateMachine as BaseStateMachine;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;
use Override;
use UnitEnum;

abstract class StateMachine extends BaseStateMachine // @pest-ignore-type
{
    #[Override]
    final public function currentState(): mixed
    {
        $field = $this->field;

        return $this->normalizeCasting($this->model->$field);
    }

    #[Override]
    final public function canBe($from, $to): bool // @pest-ignore-type
    {
        $availableTransitions = $this->transitions()[$from] ?? [];

        return collect($availableTransitions)->map(fn (mixed $state): mixed => $this->normalizeCasting($state))->contains($to);
    }

    final public function normalizeCasting($state): mixed // @pest-ignore-type
    {
        return $state instanceof UnitEnum ? $state->value : $state;
    }

    /**
     * @throws TransitionNotAllowedException
     * @throws ValidationException
     */
    #[Override]
    final public function transitionTo($from, $to, $customProperties = [], $responsible = null): void // @pest-ignore-type
    {
        $from = $this->normalizeCasting($from);
        $to = $this->normalizeCasting($to);

        if ($to === $this->currentState()) {
            return;
        }

        parent::transitionTo($from, $to, $customProperties, $responsible);
    }

    /**
     * @throws TransitionNotAllowedException
     */
    #[Override]
    final public function postponeTransitionTo($from, $to, Carbon $when, $customProperties = [], $responsible = null): ?PendingTransition // @pest-ignore-type
    {
        $from = $this->normalizeCasting($from);
        $to = $this->normalizeCasting($to);

        return parent::postponeTransitionTo($from, $to, $when, $customProperties, $responsible);
    }
}
