package com.st6.committracker.domain.dashboard.dto;

import java.util.List;
import java.util.UUID;

public record AssignmentAttributionResponse(
    int totalCommitments,
    int selfDirectedCount,
    double selfDirectedPercentage,
    int managerAssignedCount,
    double managerAssignedPercentage,
    List<AssignmentConcentration> concentrationRisks
) {
    public record AssignmentConcentration(
        UUID assignedToUserId, String assignedToName,
        int assignmentCount, double percentageOfTotal
    ) {}
}
