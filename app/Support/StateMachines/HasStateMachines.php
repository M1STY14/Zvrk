<?php

namespace App\Support\StateMachines;

use Asantibanez\LaravelEloquentStateMachines\Models\PendingTransition;
use Asantibanez\LaravelEloquentStateMachines\Models\StateHistory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use Javoscript\MacroableModels\Facades\MacroableModels;

/**
 * Trait HasStateMachines
 *
 * @property array $stateMachines
 */
trait HasStateMachines
{
    /** @noinspection PhpUndefinedMethodInspection */
    public static function bootHasStateMachines(): void
    {
        $model = new static;

        collect($model->stateMachines)
            ->each(function ($_, $field): void {
                MacroableModels::addMacro(static::class, $field, function () use ($field): State {
                    $stateMachine = new $this->stateMachines[$field]($field, $this);

                    return new State($this->{$stateMachine->field}, $stateMachine);
                });

                $camelField = Str::of($field)->camel();

                MacroableModels::addMacro(static::class, $camelField, function () use ($field): State {
                    $stateMachine = new $this->stateMachines[$field]($field, $this);

                    return new State($this->{$stateMachine->field}, $stateMachine);
                });

                $studlyField = Str::of($field)->studly();

                Builder::macro("whereHas{$studlyField}", function ($callable = null) use ($field) {
                    $model = $this->getModel();

                    if (! method_exists($model, 'stateHistory')) {
                        return $this->newQuery();
                    }

                    return $this->whereHas('stateHistory', function ($query) use ($field, $callable) {
                        $query->forField($field);
                        if ($callable !== null) {
                            $callable($query);
                        }

                        return $query;
                    });
                });
            });

        self::creating(static function (Model $model): void {
            $model->initStateMachines();
        });

        self::created(static function (Model $model): void {
            collect($model->stateMachines ?? [])
                ->each(function ($_, $field) use ($model): void {
                    $currentState = $model->$field;
                    $stateMachine = $model->$field()->stateMachine();

                    if ($currentState === null) {
                        return;
                    }

                    if (! $stateMachine->recordHistory()) {
                        return;
                    }

                    $responsible = auth()->user();
                    $changedAttributes = $model->getChangedAttributes();
                    $model->recordState($field, null, $currentState, [], $responsible, $changedAttributes);
                });
        });
    }

    public function getChangedAttributes(): array
    {
        return collect($this->getDirty())
            ->mapWithKeys(fn ($_, $attribute): array => [
                $attribute => [
                    'new' => data_get($this->getAttributes(), $attribute),
                    'old' => data_get($this->getOriginal(), $attribute),
                ],
            ])
            ->toArray();
    }

    public function initStateMachines(): void
    {
        collect($this->stateMachines)
            ->each(function ($stateMachineClass, $field): void {
                $stateMachine = new $stateMachineClass($field, $this);

                $this->{$field} ??= $stateMachine->defaultState();
            });
    }

    public function stateHistory(): MorphMany
    {
        return $this->morphMany(StateHistory::class, 'model');
    }

    public function pendingTransitions(): MorphMany
    {
        return $this->morphMany(PendingTransition::class, 'model');
    }

    public function recordState(
        $field,
        $from,
        $to,
        $customProperties = [],
        $responsible = null,
        $changedAttributes = []
    ): void {
        $stateHistory = StateHistory::query()->make([
            'field' => $field,
            'from' => $from,
            'to' => $to,
            'custom_properties' => $customProperties,
            'changed_attributes' => $changedAttributes,
        ]);

        if ($responsible !== null) {
            $stateHistory->responsible()->associate($responsible);
        }

        $this->stateHistory()->save($stateHistory);
    }

    public function recordPendingTransition(
        $field,
        $from,
        $to,
        $when,
        $customProperties = [],
        $responsible = null
    ): PendingTransition {
        /** @var PendingTransition $pendingTransition */
        $pendingTransition = PendingTransition::query()->make([
            'field' => $field,
            'from' => $from,
            'to' => $to,
            'transition_at' => $when,
            'custom_properties' => $customProperties,
        ]);

        if ($responsible !== null) {
            $pendingTransition->responsible()->associate($responsible);
        }

        return $this->pendingTransitions()->save($pendingTransition);
    }
}
