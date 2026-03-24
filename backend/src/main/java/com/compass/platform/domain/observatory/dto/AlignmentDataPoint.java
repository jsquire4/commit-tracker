package com.compass.platform.domain.observatory.dto;

import java.time.Instant;
import java.util.UUID;

public record AlignmentDataPoint(
        UUID cycleId,
        String cycleLabel,
        Instant startsAt,
        double strategicPct,
        double operationalPct,
        double defensivePct,
        double capabilityBuildingPct,
        double rallyCoveragePct,
        int totalCommitments
) {}
