package com.compass.platform.domain.observatory.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record CostWeightedSignal(
        UUID userId,
        String displayName,
        String role,
        String costBandName,
        int costBandTier,
        BigDecimal totalHours,
        BigDecimal strategicHours,
        BigDecimal nonStrategicHours,
        BigDecimal misalignmentCost
) {}
