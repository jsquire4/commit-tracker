package com.st6.committracker.domain.observatory.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ObservatoryConfigResponse(
        UUID id,
        UUID orgId,
        int driftEmergingWeeks,
        int driftSustainedWeeks,
        int driftStructuralWeeks,
        BigDecimal strategicAlignmentTarget,
        BigDecimal misalignmentWarningPct,
        BigDecimal darkWorkWarningPct,
        BigDecimal concentrationRiskPct,
        BigDecimal uniformityThreshold,
        Instant createdAt,
        Instant updatedAt
) {}
