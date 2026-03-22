package com.compass.platform.domain.observatory.dto;

import java.util.List;

public record ObservatorySignal(
        String signalType,      // "DRIFT_PATTERN", "SPECIFICITY_PATTERN", "WORK_DISTRIBUTION", "DISPLACEMENT_CASCADE"
        String status,          // "active", "partially_recovered", "resolved"
        String detectedWeek,    // e.g. "W12"
        String resolvedWeek,    // e.g. "W19" or null
        String title,           // Human-readable summary
        String body,            // Longer explanation
        List<SignalMetric> metrics
) {}
