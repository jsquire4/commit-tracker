package com.compass.platform.domain.icinsights.dto;

import java.util.UUID;

public record WeekSnapshot(
        UUID cycleId,
        String cycleLabel,
        String startsAt,
        String endsAt,
        int commitmentCount,
        int completedCount,
        double completionRate,
        double personalAlignmentPct
) {}
