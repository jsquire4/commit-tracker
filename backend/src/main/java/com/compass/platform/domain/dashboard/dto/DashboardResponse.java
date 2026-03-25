package com.compass.platform.domain.dashboard.dto;

public record DashboardResponse(
    TeamRollupResponse teamRollup,
    AlignmentSignalResponse alignmentSignal,
    AssignmentAttributionResponse assignmentAttribution,
    RcdoCoverageResponse rcdoCoverage,
    GrowthAreaAlignmentResponse growthAreaAlignment
) {}
