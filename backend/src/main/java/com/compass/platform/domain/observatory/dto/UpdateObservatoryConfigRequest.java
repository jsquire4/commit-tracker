package com.compass.platform.domain.observatory.dto;

import java.math.BigDecimal;

public record UpdateObservatoryConfigRequest(
        Integer driftEmergingWeeks,
        Integer driftSustainedWeeks,
        Integer driftStructuralWeeks,
        BigDecimal strategicAlignmentTarget,
        BigDecimal misalignmentWarningPct,
        BigDecimal darkWorkWarningPct,
        BigDecimal concentrationRiskPct,
        BigDecimal uniformityThreshold
) {}
