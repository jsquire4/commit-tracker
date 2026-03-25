package com.compass.platform.domain.observatory.dto;

import java.time.Instant;

/**
 * Unified time-scoping parameter for analytics and observatory queries.
 * Replaces the scattered {@code int weekCount} pattern with a single object
 * that supports both trailing-window (week count) and absolute date-range modes.
 *
 * <p>Use the factory methods to construct:
 * <ul>
 *   <li>{@link #ofWeeks(int)} — trailing window of N most-recent reconciled cycles</li>
 *   <li>{@link #ofDateRange(Instant, Instant)} — absolute date range</li>
 *   <li>{@link #ofWeeksOrRange(Integer, Instant, Instant)} — controller-level: date range takes priority when present</li>
 * </ul>
 */
public record TimeScope(
    Integer weekCount,
    Instant dateFrom,
    Instant dateTo
) {
    /** Trailing-window mode: last N reconciled cycles. */
    public static TimeScope ofWeeks(int weeks) {
        if (weeks < 1) throw new IllegalArgumentException("weekCount must be >= 1, got " + weeks);
        return new TimeScope(weeks, null, null);
    }

    /** Absolute date-range mode. */
    public static TimeScope ofDateRange(Instant from, Instant to) {
        if (from == null || to == null) throw new IllegalArgumentException("dateFrom and dateTo must both be non-null");
        if (from.isAfter(to)) throw new IllegalArgumentException("dateFrom must not be after dateTo");
        return new TimeScope(null, from, to);
    }

    /**
     * Controller convenience: when dateFrom and dateTo are both present, use date-range mode.
     * Otherwise fall back to weekCount (using the provided default if weekCount is also null).
     */
    public static TimeScope ofWeeksOrRange(Integer weekCount, Instant dateFrom, Instant dateTo, int defaultWeeks) {
        if (dateFrom != null && dateTo != null) {
            return ofDateRange(dateFrom, dateTo);
        }
        return ofWeeks(weekCount != null ? weekCount : defaultWeeks);
    }

    public boolean isDateRange() { return dateFrom != null && dateTo != null; }
    public boolean isWeekCount() { return weekCount != null && !isDateRange(); }

    /** Returns the effective week count, or throws if this is a date-range scope. */
    public int effectiveWeekCount() {
        if (weekCount == null) throw new IllegalStateException("TimeScope is date-range mode, not week-count");
        return weekCount;
    }
}
