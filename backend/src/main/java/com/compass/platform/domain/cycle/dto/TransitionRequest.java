package com.compass.platform.domain.cycle.dto;

import com.compass.platform.domain.CycleState;
import jakarta.validation.constraints.NotNull;

public record TransitionRequest(
    @NotNull CycleState targetState,
    String reason
) {}
// NOTE: No managerOverride field. Early reconciliation override is inferred
// server-side from the actor's role (DIRECTOR+ can override). Never trust
// the client to assert its own privilege level.
