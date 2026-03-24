package com.compass.platform.domain.icinsights.dto;

import java.time.Instant;
import java.util.UUID;

public record PersonalReflectionResponse(
        UUID id,
        UUID cycleId,
        String alignmentSignal,
        String learningNote,
        Instant createdAt
) {}
