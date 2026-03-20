package com.compass.platform.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record DriftSignal(
        DriftUnitType unitType,
        UUID unitId,
        String unitName,
        DriftMetric metric,
        DriftSeverity severity,
        double currentValue,
        double baselineValue,
        int weekCount,
        TrendDirection trendDirection,
        List<Double> dataPoints
) {}
