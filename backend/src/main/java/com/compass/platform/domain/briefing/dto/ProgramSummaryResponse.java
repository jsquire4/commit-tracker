package com.compass.platform.domain.briefing.dto;

import java.time.Instant;

/**
 * Response DTO for the program-level LLM narrative summary.
 *
 * <p>Returned by {@code GET /api/v1/observatory/program-summary}.
 * The {@code narrative} is a 2-3 sentence summary of the organisation's
 * execution trajectory over the requested window. When no LLM key is
 * configured a deterministic template fallback is used instead.
 */
public record ProgramSummaryResponse(
        String narrative,
        Instant generatedAt
) {}
