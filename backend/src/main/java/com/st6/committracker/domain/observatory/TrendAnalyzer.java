package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.observatory.dto.TrendDirection;

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

        // Baseline is the value at the start of the decline streak (or the first value if no
        // decline was found — used to compare against the current level).
        double baselineValue;
        if (declineWeeks > 0) {
            baselineValue = values.get(values.size() - 1 - declineWeeks);
        } else {
            baselineValue = values.get(0);
        }

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
