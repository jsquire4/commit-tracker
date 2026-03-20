package com.compass.platform.domain.briefing.dto;

import java.time.Instant;
import java.util.List;

public record BriefingResponse(
        String narrative,
        List<BriefingSuggestion> suggestions,
        List<BriefingCitation> citations,
        Instant generatedAt
) {}
