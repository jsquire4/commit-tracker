package com.compass.platform.domain.observatory.dto;

import java.util.List;

/**
 * Composite dashboard response containing health summary, alignment trend, and completion trend.
 * Returned by GET /api/v1/observatory/dashboard.
 */
public record ObservatoryDashboardResponse(
        ExecutiveHealthResponse health,
        List<AlignmentDataPoint> alignmentTrend,
        List<CompletionDataPoint> completionTrend
) {}
