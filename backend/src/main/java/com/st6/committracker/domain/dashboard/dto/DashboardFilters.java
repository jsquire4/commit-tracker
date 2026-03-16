package com.st6.committracker.domain.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardFilters(
    Instant cycleWeekStart,
    UUID teamMemberId,
    UUID rcdoId,
    String rcdoType, // "RALLY_CRY", "DEFINING_OBJECTIVE", "OUTCOME"
    boolean includeSubtree
) {}
