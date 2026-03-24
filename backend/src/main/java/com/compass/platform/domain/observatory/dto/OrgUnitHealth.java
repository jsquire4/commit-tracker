package com.compass.platform.domain.observatory.dto;

import java.util.UUID;

public record OrgUnitHealth(
        UUID managerId,
        String managerName,
        String role,
        int headcount,
        int costBandWeightedHeadcount,
        HealthGrade grade,
        double strategicAlignmentPct,
        double rallyCoveragePct,
        double completionRate,
        String trendDirection,
        int weeksTrending
) {}
