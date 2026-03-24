package com.compass.platform.domain.growth.dto;

import java.time.Instant;
import java.util.UUID;

public record GrowthAreaDto(
        UUID id,
        String label,
        String description,
        boolean isActive,
        int sortOrder,
        Instant createdAt,
        Instant updatedAt
) {}
