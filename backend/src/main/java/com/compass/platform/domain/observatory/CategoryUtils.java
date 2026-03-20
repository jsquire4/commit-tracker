package com.compass.platform.domain.observatory;

import com.compass.platform.domain.commit.Commitment;

import java.math.BigDecimal;

/**
 * Shared static utilities for chess category normalization and effort-hours resolution.
 * Used by AnalyticsService, DriftDetectionService, and the seed generator.
 * Contains no Spring dependencies — safe to call from any context.
 */
public final class CategoryUtils {

    private CategoryUtils() {}

    /**
     * Normalize a chess category name to a canonical key for analytics aggregation.
     * "Strategic" → "Strategic", "STRATEGIC" → "Strategic", null → "Uncategorized".
     * The canonical form is title-case (matching the DB seed data convention).
     * Frontend charts key on these exact strings — do not change the casing.
     */
    public static String normalizeCategoryName(String name) {
        if (name == null) return "Uncategorized";
        return switch (name.toUpperCase().replace(" ", "_")) {
            case "STRATEGIC" -> "Strategic";
            case "OPERATIONAL" -> "Operational";
            case "DEFENSIVE" -> "Defensive";
            case "CAPABILITY_BUILDING" -> "Capability Building";
            default -> name; // pass through custom categories as-is
        };
    }

    /**
     * Returns estimated hours for a commitment. Uses explicit value if set,
     * otherwise falls back to horizon-based defaults:
     * EOW=8h, EOD=4h, AFTERNOON=2h, MIDDAY/MORNING=1h.
     */
    public static BigDecimal resolveEffortHours(Commitment c) {
        if (c.getEstimatedHours() != null) return c.getEstimatedHours();
        if (c.getCompletionHorizon() == null) return new BigDecimal("4"); // safe default
        return switch (c.getCompletionHorizon()) {
            case EOW -> new BigDecimal("8");
            case EOD -> new BigDecimal("4");
            case AFTERNOON -> new BigDecimal("2");
            case MIDDAY, MORNING -> new BigDecimal("1");
        };
    }
}
