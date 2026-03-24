package com.compass.platform.domain.icinsights.dto;

import java.util.List;
import java.util.UUID;

public record WeekGroup(
        UUID cycleId,
        String cycleLabel,
        String startsAt,
        String endsAt,
        String cycleState,
        List<HistoryCommitment> commitments
) {}
