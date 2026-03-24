package com.compass.platform.domain.icinsights.dto;

import java.util.List;
import java.util.UUID;

public record IcWeekSummaryResponse(
        UUID cycleId,
        String cycleLabel,
        String startsAt,
        String endsAt,
        int totalPlanned,
        int completed,
        int partiallyCompleted,
        int notStarted,
        int carriedForward,
        int unplanned,
        double completionRate,
        double personalAlignmentPct,
        List<GrowthAreaHit> growthAreaHits,
        int displacementCount,
        String narrativeSummary
) {}
