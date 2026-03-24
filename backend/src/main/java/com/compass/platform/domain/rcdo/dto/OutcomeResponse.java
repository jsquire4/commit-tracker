package com.compass.platform.domain.rcdo.dto;

import java.time.Instant;
import java.util.UUID;

public record OutcomeResponse(
    UUID id,
    UUID definingObjectiveId,
    String title,
    String description,
    UUID ownerUserId,
    int sortOrder,
    Instant createdAt
) {}
