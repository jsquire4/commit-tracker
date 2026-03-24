package com.compass.platform.domain.observatory.dto;

import java.util.UUID;

public record WeekCell(
        UUID cycleId,
        String cycleLabel,
        String dominantCategory,
        double strategicPct,
        double operationalPct,
        double defensivePct,
        double capabilityBuildingPct,
        double rallyCoveragePct,
        int totalCommitments
) {}
