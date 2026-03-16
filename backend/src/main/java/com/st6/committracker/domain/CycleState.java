package com.st6.committracker.domain;

import java.util.Set;

public enum CycleState {
    DRAFT, LOCKED, RECONCILING, RECONCILED;

    public Set<CycleState> validTransitions() {
        return switch (this) {
            case DRAFT -> Set.of(LOCKED);
            case LOCKED -> Set.of(RECONCILING);
            case RECONCILING -> Set.of(RECONCILED);
            case RECONCILED -> Set.of();
        };
    }
}
