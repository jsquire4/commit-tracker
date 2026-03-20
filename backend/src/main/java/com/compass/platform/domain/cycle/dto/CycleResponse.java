package com.compass.platform.domain.cycle.dto;

import com.compass.platform.domain.CycleState;

import java.time.Instant;
import java.util.UUID;

public record CycleResponse(
    UUID id,
    UUID orgId,
    String label,
    CycleState state,
    Instant startsAt,
    Instant endsAt,
    boolean isActive,
    int commitmentCount,
    Instant createdAt,
    Instant updatedAt
) {}
