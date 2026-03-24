package com.compass.platform.domain.icinsights.dto;

import java.util.List;

public record MyStoryResponse(
        List<GrowthAreaProgress> growthAreaProgress,
        List<WeekSnapshot> recentWeeks,
        PatternStats patternStats,
        String narrativeInsight,
        List<String> resumeBullets,
        double overallAlignmentPct,
        List<GrowthAreaAlignmentDetail> growthAreaAlignmentDetails
) {}
