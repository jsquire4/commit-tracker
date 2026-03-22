package com.compass.platform.domain.observatory.dto;

import java.time.Instant;

/**
 * Response DTO for the per-week LLM narrative endpoint.
 *
 * <p>Returned by {@code GET /api/v1/observatory/week-narrative?cycleId=...}.
 * The frontend uses this to replace the deterministic template narrative in
 * the SpeechBubble popover once the LLM response arrives.
 */
public record WeekNarrativeResponse(
        String narrative,
        Instant generatedAt
) {}
