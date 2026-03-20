package com.compass.platform.domain.observatory.dto;

import java.util.UUID;

public record CarryForwardChain(
        UUID commitmentId,
        String title,
        UUID userId,
        String userDisplayName,
        int chainLength,
        String originCycleLabel
) {}
