package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.observatory.dto.TrendDirection;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class TrendAnalyzerTest {

    // ─────────────────────────────────────────────────────────────────────────
    // Basic decline detection
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void analyzeDecline_singleValue_returnsFlatWithZeroDeclines() {
        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(List.of(80.0), 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
        assertThat(result.direction()).isEqualTo(TrendDirection.FLAT);
        assertThat(result.currentValue()).isCloseTo(80.0, within(0.001));
        assertThat(result.baselineValue()).isCloseTo(80.0, within(0.001));
    }

    @Test
    void analyzeDecline_emptyList_returnsZeroFlatResult() {
        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(List.of(), 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
        assertThat(result.direction()).isEqualTo(TrendDirection.FLAT);
        assertThat(result.currentValue()).isCloseTo(0.0, within(0.001));
    }

    @Test
    void analyzeDecline_fiveConsecutiveDeclines_returnsCorrectCount() {
        // Each week drops by 5 (well above the 2.0 tolerance)
        List<Double> values = List.of(80.0, 75.0, 70.0, 65.0, 60.0, 55.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(5);
        assertThat(result.currentValue()).isCloseTo(55.0, within(0.001));
        assertThat(result.baselineValue()).isCloseTo(80.0, within(0.001));
        assertThat(result.direction()).isEqualTo(TrendDirection.DECLINING);
    }

    @Test
    void analyzeDecline_streakBrokenByFlat_countsOnlyRecentStreak() {
        // Weeks 1-3: decline, week 4: flat, weeks 5-6: decline again
        // Walking backward from week 6: 2 consecutive declines before hitting flat
        List<Double> values = List.of(80.0, 75.0, 70.0, 70.0, 65.0, 60.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(2);
        assertThat(result.currentValue()).isCloseTo(60.0, within(0.001));
    }

    @Test
    void analyzeDecline_streakBrokenByIncrease_countsOnlyRecentStreak() {
        // Older decline, then recovery, then fresh decline streak of 3
        List<Double> values = List.of(70.0, 65.0, 75.0, 70.0, 65.0, 60.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(3);
        assertThat(result.direction()).isEqualTo(TrendDirection.DECLINING);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tolerance behaviour
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void analyzeDecline_withinTolerance_doesNotCountAsDecline() {
        // Drops of 1.5 — below the 2.0 tolerance — should not count as decline
        List<Double> values = List.of(80.0, 78.6, 77.2, 75.8);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
    }

    @Test
    void analyzeDecline_exactlyAtTolerance_doesNotCount() {
        // Drop of exactly 2.0 should be treated as flat (must EXCEED tolerance)
        List<Double> values = List.of(80.0, 78.0, 76.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
    }

    @Test
    void analyzeDecline_justAboveTolerance_counts() {
        // Drop of 2.01 — just above 2.0 tolerance — should count
        List<Double> values = List.of(80.0, 77.99);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(1);
        assertThat(result.direction()).isEqualTo(TrendDirection.DECLINING);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Direction classification
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void analyzeDecline_overallImproving_returnsImprovingDirection() {
        // Dropped in the last step by 5 (above tolerance), but overall trajectory is up:
        // started at 50, now at 65 — first→last delta is +15, clearly improving
        List<Double> values = List.of(50.0, 60.0, 70.0, 65.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.direction()).isEqualTo(TrendDirection.IMPROVING);
        assertThat(result.declineWeeks()).isEqualTo(1); // last step is a decline of 5
    }

    @Test
    void analyzeDecline_overallFlat_returnsFlatDirection() {
        // No meaningful change between first and last
        List<Double> values = List.of(80.0, 79.5, 80.3, 80.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.direction()).isEqualTo(TrendDirection.FLAT);
    }

    @Test
    void analyzeDecline_constantValues_returnsFlatWithZeroDeclines() {
        List<Double> values = List.of(75.0, 75.0, 75.0, 75.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
        assertThat(result.direction()).isEqualTo(TrendDirection.FLAT);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Baseline value
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void analyzeDecline_threeWeekStreak_baselineIsStartOfStreak() {
        // [80, 75, 70] — 3-week decline from the oldest value, so baseline should be 80
        List<Double> values = List.of(80.0, 75.0, 70.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(2);
        // streak of 2 means we walked back 2 steps from current (70) → baseline is values[0] = 80
        assertThat(result.baselineValue()).isCloseTo(80.0, within(0.001));
        assertThat(result.currentValue()).isCloseTo(70.0, within(0.001));
    }

    @Test
    void analyzeDecline_noDecline_baselineIsFirstValue() {
        List<Double> values = List.of(60.0, 65.0, 70.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(0);
        assertThat(result.baselineValue()).isCloseTo(60.0, within(0.001));
        assertThat(result.currentValue()).isCloseTo(70.0, within(0.001));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edge cases for drift severity threshold compatibility
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void analyzeDecline_threeWeekDeclineAtEmerging_returnsThreeDeclineWeeks() {
        // Three declining steps — should surface as EMERGING (threshold = 3 in defaults)
        List<Double> values = List.of(80.0, 74.0, 68.0, 62.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(3);
    }

    @Test
    void analyzeDecline_twoWeekDecline_belowEmerging_returnsTwo() {
        List<Double> values = List.of(80.0, 74.0, 68.0);

        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);

        assertThat(result.declineWeeks()).isEqualTo(2);
    }
}
