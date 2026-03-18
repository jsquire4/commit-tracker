package com.st6.committracker.domain.observatory.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ExecutiveHealthResponse(
        UUID orgId,
        String orgName,
        HealthGrade overallGrade,
        double strategicAlignmentPct,
        double completionRate,
        double carryForwardRate,
        int activeDriftSignals,
        int integrityFlags,
        List<OrgUnitHealth> units,
        Instant computedAt
) {}
