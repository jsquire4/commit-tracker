package com.compass.platform.domain.icinsights.dto;

import java.util.Map;

public record PatternStats(
        int totalCommitments,
        int totalCompleted,
        double overallCompletionRate,
        double overallCarryForwardRate,
        int totalDisplacements,
        int totalUnplanned,
        Map<String, Integer> categoryDistribution
) {}
