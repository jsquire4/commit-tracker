package com.compass.platform.domain.briefing.dto;

public record BriefingCitation(
        String label,
        String value,
        String source,
        String endpoint
) {}
