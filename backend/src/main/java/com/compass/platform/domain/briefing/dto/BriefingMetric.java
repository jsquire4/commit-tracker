package com.compass.platform.domain.briefing.dto;

public record BriefingMetric(
        String key,
        String label,
        double value,
        String suffix,
        String trend
) {}
