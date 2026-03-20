package com.compass.platform.domain.observatory.dto;

import java.util.Map;
import java.util.UUID;

public record IntegrityFlag(
        IntegrityFlagType type,
        UUID userId,
        Map<String, Object> details
) {}
