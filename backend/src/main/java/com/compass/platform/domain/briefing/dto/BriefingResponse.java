package com.compass.platform.domain.briefing.dto;

import java.time.Instant;
import java.util.List;

public record BriefingResponse(
        String headline,
        String narrative,
        List<BriefingSuggestion> suggestions,
        List<BriefingCitation> citations,
        List<BriefingMetric> metrics,
        Instant generatedAt
) {}
