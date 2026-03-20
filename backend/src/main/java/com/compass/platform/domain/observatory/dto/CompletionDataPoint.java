package com.compass.platform.domain.observatory.dto;

import java.time.Instant;
import java.util.UUID;

public record CompletionDataPoint(
        UUID cycleId,
        String cycleLabel,
        Instant startsAt,
        double completionRate,
        double carryForwardRate,
        double notStartedRate,
        int totalCommitments,
        int reconciledCount
) {}
