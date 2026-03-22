package com.compass.platform.domain.observatory.dto;

import java.time.Instant;
import java.util.List;

public record SignalsSummaryResponse(
        List<ObservatorySignal> signals,
        Instant computedAt
) {}
