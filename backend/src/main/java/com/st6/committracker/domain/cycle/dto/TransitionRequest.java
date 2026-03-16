package com.st6.committracker.domain.cycle.dto;

import com.st6.committracker.domain.CycleState;
import jakarta.validation.constraints.NotNull;

public record TransitionRequest(
    @NotNull CycleState targetState,
    String reason
) {}
// NOTE: No managerOverride field. Early reconciliation override is inferred
// server-side from the actor's role (DIRECTOR+ can override). Never trust
// the client to assert its own privilege level.
