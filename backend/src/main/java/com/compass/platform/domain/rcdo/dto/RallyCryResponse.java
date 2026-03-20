package com.compass.platform.domain.rcdo.dto;

import java.time.Instant;
import java.util.UUID;

public record RallyCryResponse(
    UUID id,
    String title,
    String description,
    int sortOrder,
    Instant createdAt
) {}
