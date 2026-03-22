package com.compass.platform.domain.dashboard.dto;

import java.time.Instant;
import java.util.List;

/**
 * LLM-generated team summary for the My Team page AI Summary card.
 *
 * <p>Returned by {@code GET /api/v1/dashboard/team-summary}.
 * When the LLM is not configured, the backend returns a null body and the
 * frontend falls back to the deterministic {@code buildSummary()} function.
 */
public record TeamSummaryResponse(
        String headline,
        String narrative,
        List<String> suggestedActions,
        Instant generatedAt
) {}
