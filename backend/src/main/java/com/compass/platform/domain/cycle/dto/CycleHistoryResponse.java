package com.compass.platform.domain.cycle.dto;

import com.compass.platform.domain.CycleState;

import java.time.Instant;
import java.util.UUID;

public record CycleHistoryResponse(
        UUID id,
        String label,
        CycleState state,
        Instant startsAt,
        Instant endsAt
) {}
