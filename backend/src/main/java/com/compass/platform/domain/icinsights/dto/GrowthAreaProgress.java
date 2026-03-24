package com.compass.platform.domain.icinsights.dto;

import java.util.List;
import java.util.UUID;

public record GrowthAreaProgress(
        UUID growthAreaId,
        String label,
        int totalCommitments,
        int completedCommitments,
        List<WeeklyCount> weeklyBreakdown
) {}
