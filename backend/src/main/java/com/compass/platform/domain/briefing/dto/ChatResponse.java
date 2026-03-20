package com.compass.platform.domain.briefing.dto;

import java.time.Instant;

public record ChatResponse(
        String content,
        Instant timestamp
) {}
