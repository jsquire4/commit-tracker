package com.st6.committracker.domain.dashboard.dto;

import java.util.List;
import java.util.UUID;

public record RcdoCoverageResponse(
    int totalCommitments,
    int linkedCount,
    int unlinkedCount,
    double linkedPercentage,
    List<RallyCryCoverage> byRallyCry,
    List<UncoveredObjective> uncoveredObjectives
) {
    public record RallyCryCoverage(UUID rallyCryId, String title, int commitmentCount, double percentage) {}
    public record UncoveredObjective(UUID definingObjectiveId, String title, String rallyCryTitle) {}
}
