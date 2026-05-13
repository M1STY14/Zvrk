<?php

namespace App;

trait CompareEnumTrait
{
    public function is(self $status): bool
    {
        return $this->value === $status->value;
    }

    public function isNot(self $status): bool
    {
        return !$this->is($status);
    }
}
