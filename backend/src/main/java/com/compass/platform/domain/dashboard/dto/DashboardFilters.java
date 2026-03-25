package com.compass.platform.domain.dashboard.dto;

import java.time.Instant;
import java.util.UUID;

public record DashboardFilters(
    Instant cycleWeekStart,
    Instant cycleWeekEnd,
    UUID teamMemberId,
    UUID rcdoId,
    String rcdoType, // "RALLY_CRY", "DEFINING_OBJECTIVE", "OUTCOME"
    boolean includeSubtree
) {}
