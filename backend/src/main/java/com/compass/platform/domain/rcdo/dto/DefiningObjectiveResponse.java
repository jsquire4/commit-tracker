package com.compass.platform.domain.rcdo.dto;

import java.time.Instant;
import java.util.UUID;

public record DefiningObjectiveResponse(
    UUID id,
    UUID rallyCryId,
    String title,
    String description,
    UUID ownerUserId,
    int sortOrder,
    Instant createdAt
) {}
