package com.compass.platform.domain.observatory;

import com.compass.platform.domain.observatory.dto.TrendDirection;

import java.util.List;

/**
 * Pure analysis utility — no Spring dependencies, no repository access. Easily testable.
 * <p>
 * Counts consecutive declining weeks from the most recent data point backward to determine
 * whether a metric trend is DECLINING, FLAT, or IMPROVING.
 */
public class TrendAnalyzer {

    private TrendAnalyzer() {
        // utility class — not instantiable
    }

    public record TrendResult(
            int declineWeeks,
            double baselineValue,
            double currentValue,
            TrendDirection direction
    ) {}

    /**
     * Count consecutive improving weeks from the most recent data point backward.
     * Mirrors the logic of {@link #analyzeDecline} but in the upward direction.
     *
     * @param values    Chronological list of metric values (oldest → newest).
     * @param tolerance Minimum absolute change that counts as an improvement.
     * @return number of consecutive weeks where the metric improved (0 if no streak).
     */
    public static int countImprovingWeeks(List<Double> values, double tolerance) {
        if (values == null || values.size() < 2) {
            return 0;
        }
        int improvingWeeks = 0;
        for (int i = values.size() - 2; i >= 0; i--) {
            double prev = values.get(i);
            double next = values.get(i + 1);
            if (next - prev > tolerance) {
                improvingWeeks++;
            } else {
                break;
            }
        }
        return improvingWeeks;
    }

    /**
     * Analyse a chronological sequence of metric values (oldest first, newest last) for
     * consecutive decline.
     *
     * @param values    Chronological list of metric values (oldest → newest).
     *                  Must contain at least one element; a single-element list always
     *                  produces direction=FLAT with declineWeeks=0.
     * @param tolerance Minimum absolute change that counts as a decline.
     *                  E.g. 2.0 means a drop of less than 2.0 units is treated as flat.
     * @return TrendResult with consecutive decline count, baseline, current value, and direction.
     */
    public static TrendResult analyzeDecline(List<Double> values, double tolerance) {
        if (values == null || values.isEmpty()) {
            return new TrendResult(0, 0.0, 0.0, TrendDirection.FLAT);
        }

        if (values.size() == 1) {
            double only = values.get(0);
            return new TrendResult(0, only, only, TrendDirection.FLAT);
        }

        double currentValue = values.get(values.size() - 1);

        // Walk backward from the second-to-last element, counting consecutive declines.
        // A "decline" at position i means values[i] > values[i+1] + tolerance
        // (i.e. the next week is meaningfully lower than this week).
        int declineWeeks = 0;
        for (int i = values.size() - 2; i >= 0; i--) {
            double prev = values.get(i);
            double next = values.get(i + 1);
            if (prev - next > tolerance) {
                declineWeeks++;
            } else {
                // Streak broken — stop counting
                break;
            }
        }

        // Baseline is the value at the start of the decline streak.
        // When there is no decline streak, use currentValue (the latest reading) as the baseline
        // so that callers comparing baseline vs current see no delta rather than a misleading
        // comparison against the oldest data point.
        double baselineValue = declineWeeks > 0 ? values.get(values.size() - 1 - declineWeeks) : currentValue;

        // Determine overall direction based on first vs last value.
        TrendDirection direction;
        double overall = values.get(0) - currentValue; // positive means decline overall
        if (overall > tolerance) {
            direction = TrendDirection.DECLINING;
        } else if (currentValue - values.get(0) > tolerance) {
            direction = TrendDirection.IMPROVING;
        } else {
            direction = TrendDirection.FLAT;
        }

        return new TrendResult(declineWeeks, baselineValue, currentValue, direction);
    }
}
