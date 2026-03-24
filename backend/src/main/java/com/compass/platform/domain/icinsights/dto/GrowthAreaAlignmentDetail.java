package com.compass.platform.domain.icinsights.dto;

import java.util.List;
import java.util.UUID;

public record GrowthAreaAlignmentDetail(
        UUID growthAreaId,
        String label,
        boolean isActive,
        int alignedCommitmentCount,
        int completedCount,
        List<AlignedTask> topTasks
) {
    public record AlignedTask(
            UUID commitmentId,
            String title,
            String cycleLabel,
            String reconciliationStatus  // COMPLETED, PARTIALLY_COMPLETED, NOT_STARTED, CARRIED_FORWARD, or null
    ) {}
}
