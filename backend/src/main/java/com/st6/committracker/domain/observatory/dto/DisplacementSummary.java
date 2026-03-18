package com.st6.committracker.domain.observatory.dto;

import java.util.List;
import java.util.Map;

public record DisplacementSummary(
        int totalDisplacements,
        List<CategoryCount> byCategory,
        Map<Integer, Integer> weeklyTrend
) {}
