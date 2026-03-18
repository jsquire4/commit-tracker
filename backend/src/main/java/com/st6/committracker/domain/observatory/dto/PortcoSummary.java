package com.st6.committracker.domain.observatory.dto;

import java.util.UUID;

public record PortcoSummary(
        UUID orgId,
        String orgName,
        HealthGrade overallGrade,
        double strategicAlignmentPct,
        double completionRate,
        int activeDriftSignals,
        long headcount
) {}
