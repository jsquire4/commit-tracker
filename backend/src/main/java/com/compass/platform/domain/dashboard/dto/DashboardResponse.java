package com.compass.platform.domain.dashboard.dto;

import java.util.UUID;

/**
 * Composite dashboard response.
 * {@code resolvedCycleId} is the cycle the backend resolved from the filters
 * (either the active cycle or the one matching {@code cycleWeekStart}).
 * The frontend should use this for any follow-up queries that need a cycle ID.
 */
public record DashboardResponse(
    UUID resolvedCycleId,
    TeamRollupResponse teamRollup,
    AlignmentSignalResponse alignmentSignal,
    AssignmentAttributionResponse assignmentAttribution,
    RcdoCoverageResponse rcdoCoverage,
    GrowthAreaAlignmentResponse growthAreaAlignment
) {}
