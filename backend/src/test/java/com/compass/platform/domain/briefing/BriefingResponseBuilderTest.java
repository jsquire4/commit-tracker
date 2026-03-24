package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.BriefingCitation;
import com.compass.platform.domain.briefing.dto.BriefingMetric;
import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.BriefingSuggestion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class BriefingResponseBuilderTest {

    private BriefingResponseBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new BriefingResponseBuilder();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // emptyBriefing
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class EmptyBriefing {

        @Test
        void emptyBriefing_returnsFixedHeadline() {
            BriefingResponse response = builder.emptyBriefing();

            assertThat(response.headline()).isEqualTo("Weekly Intelligence Summary");
        }

        @Test
        void emptyBriefing_narrativeIndicatesNoData() {
            BriefingResponse response = builder.emptyBriefing();

            assertThat(response.narrative()).isEqualTo("No reconciled cycles available for briefing.");
        }

        @Test
        void emptyBriefing_suggestionsIsEmpty() {
            assertThat(builder.emptyBriefing().suggestions()).isEmpty();
        }

        @Test
        void emptyBriefing_citationsIsEmpty() {
            assertThat(builder.emptyBriefing().citations()).isEmpty();
        }

        @Test
        void emptyBriefing_metricsIsEmpty() {
            assertThat(builder.emptyBriefing().metrics()).isEmpty();
        }

        @Test
        void emptyBriefing_generatedAtIsRecent() {
            Instant before = Instant.now();
            BriefingResponse response = builder.emptyBriefing();
            Instant after = Instant.now();

            assertThat(response.generatedAt()).isBetween(before, after);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildResponse
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildResponse {

        private BriefingDataGatherer.BriefingDataContext ctx;
        private List<BriefingSuggestion> suggestions;

        @BeforeEach
        void setUpContext() {
            Map<String, Double> refData = new HashMap<>();
            refData.put("E.prev_carry_forward", 20.0);
            ctx = new BriefingDataGatherer.BriefingDataContext(
                    "test prompt",
                    refData,
                    /* alignmentPct      */ 72.0,
                    /* completionRate    */ 65.0,
                    /* carryForwardRate  */ 18.0,
                    /* driftCount        */ 3,
                    /* rallyCryCoveragePct */ 85.0,
                    /* totalCommitments  */ 40
            );
            suggestions = List.of(
                    new BriefingSuggestion("s1", "Review carry-forward items", "REVIEW"),
                    new BriefingSuggestion("s2", "Link unlinked commitments to rally cries", "LINK")
            );
        }

        @Test
        void buildResponse_headlineIsFixed() {
            BriefingResponse response = builder.buildResponse("The narrative.", suggestions, ctx);

            assertThat(response.headline()).isEqualTo("Weekly Intelligence Summary");
        }

        @Test
        void buildResponse_narrativePassedThrough() {
            BriefingResponse response = builder.buildResponse("Custom narrative text.", suggestions, ctx);

            assertThat(response.narrative()).isEqualTo("Custom narrative text.");
        }

        @Test
        void buildResponse_suggestionsPassedThrough() {
            BriefingResponse response = builder.buildResponse("n", suggestions, ctx);

            assertThat(response.suggestions()).isEqualTo(suggestions);
        }

        @Test
        void buildResponse_citationsHaveFourEntries() {
            BriefingResponse response = builder.buildResponse("n", suggestions, ctx);

            assertThat(response.citations()).hasSize(4);
        }

        @Test
        void buildResponse_metricsHaveFourEntries() {
            BriefingResponse response = builder.buildResponse("n", suggestions, ctx);

            assertThat(response.metrics()).hasSize(4);
        }

        @Test
        void buildResponse_generatedAtIsRecent() {
            Instant before = Instant.now();
            BriefingResponse response = builder.buildResponse("n", suggestions, ctx);
            Instant after = Instant.now();

            assertThat(response.generatedAt()).isBetween(before, after);
        }

        @Test
        void buildResponse_emptySuggestionsList_isAccepted() {
            BriefingResponse response = builder.buildResponse("n", Collections.emptyList(), ctx);

            assertThat(response.suggestions()).isEmpty();
        }

        @Test
        void buildResponse_nullSuggestionsList_isPassedThrough() {
            BriefingResponse response = builder.buildResponse("n", null, ctx);

            assertThat(response.suggestions()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildCitations — content correctness
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildCitations {

        @Test
        void buildCitations_alignmentLabelFormattedCorrectly() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(72.5, 0, 0, 0, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c1 = findById(citations, "c1");
            assertThat(c1.label()).isEqualTo("Strategic alignment: 73%");
        }

        @Test
        void buildCitations_alignmentDetailIncludesTotalCommitments() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(60.0, 0, 0, 0, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c1 = findById(citations, "c1");
            assertThat(c1.detail()).contains("0 commitments");
        }

        @Test
        void buildCitations_alignmentDetailIncludesTotalCommitmentsCount() {
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of(), 60.0, 0, 0, 0, 0, 25);

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c1 = findById(citations, "c1");
            assertThat(c1.detail()).isEqualTo("Computed from 25 commitments");
        }

        @Test
        void buildCitations_rallyCryCoverageFormattedCorrectly() {
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of(), 0, 0, 0, 0, 88.4, 10);

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c2 = findById(citations, "c2");
            assertThat(c2.label()).isEqualTo("Rally Cry Coverage: 88%");
        }

        @Test
        void buildCitations_carryForwardRateFormattedCorrectly() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 33.7, 0, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c3 = findById(citations, "c3");
            assertThat(c3.label()).isEqualTo("Carry-Forward Rate: 34%");
        }

        @Test
        void buildCitations_driftCountFormattedCorrectly() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0, 5, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            BriefingCitation c4 = findById(citations, "c4");
            assertThat(c4.label()).isEqualTo("Active Drift Signals: 5");
        }

        @Test
        void buildCitations_allLinkTextsPresent() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0, 0, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            assertThat(citations).extracting(BriefingCitation::linkText)
                    .containsExactly("View breakdown", "View details", "View list", "View signals");
        }

        @Test
        void buildCitations_idSequenceIsCorrect() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0, 0, 0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            assertThat(citations).extracting(BriefingCitation::id)
                    .containsExactly("c1", "c2", "c3", "c4");
        }

        @Test
        void buildCitations_zeroValues_renderWithoutException() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0.0, 0.0, 0.0, 0, 0.0, Map.of());

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            assertThat(citations).hasSize(4);
            assertThat(findById(citations, "c1").label()).isEqualTo("Strategic alignment: 0%");
            assertThat(findById(citations, "c4").label()).isEqualTo("Active Drift Signals: 0");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildMetrics — values and trend direction
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildMetrics {

        @Test
        void buildMetrics_returnsExactlyFourMetrics() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(70, 65, 20, 2, 80, Map.of("E.prev_carry_forward", 20.0));

            assertThat(builder.buildMetrics(ctx)).hasSize(4);
        }

        @Test
        void buildMetrics_keysAndLabelsAreCorrect() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(70, 65, 20, 2, 80, Map.of("E.prev_carry_forward", 20.0));

            List<BriefingMetric> metrics = builder.buildMetrics(ctx);

            assertThat(metrics).extracting(BriefingMetric::key)
                    .containsExactly("coverage", "carry", "completion", "drift");
            assertThat(metrics).extracting(BriefingMetric::label)
                    .containsExactly("Rally Cry Coverage", "Carry-Forward Rate", "Completion Rate", "Active Drift Signals");
        }

        @Test
        void buildMetrics_coverageValueRounded() {
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of("E.prev_carry_forward", 0.0), 0, 0, 0, 0, 84.6, 10);

            BriefingMetric coverage = findMetricByKey(builder.buildMetrics(ctx), "coverage");

            // Math.round(84.6) == 85
            assertThat(coverage.value()).isCloseTo(85.0, within(0.001));
            assertThat(coverage.suffix()).isEqualTo("%");
        }

        @Test
        void buildMetrics_completionValueRounded() {
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of("E.prev_carry_forward", 0.0), 0, 67.4, 0, 0, 0, 10);

            BriefingMetric completion = findMetricByKey(builder.buildMetrics(ctx), "completion");

            assertThat(completion.value()).isCloseTo(67.0, within(0.001));
            assertThat(completion.suffix()).isEqualTo("%");
        }

        @Test
        void buildMetrics_driftCountHasNullSuffix() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0, 4, 0, Map.of("E.prev_carry_forward", 0.0));

            BriefingMetric drift = findMetricByKey(builder.buildMetrics(ctx), "drift");

            assertThat(drift.value()).isCloseTo(4.0, within(0.001));
            assertThat(drift.suffix()).isNull();
        }

        @Test
        void buildMetrics_carryTrend_upWhenRateIncreasedFromPrevious() {
            // carryForwardRate (30) > E.prev_carry_forward (20) -> "up"
            Map<String, Double> refData = Map.of("E.prev_carry_forward", 20.0);
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 30.0, 0, 0, refData);

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("up");
        }

        @Test
        void buildMetrics_carryTrend_downWhenRateDecreasedFromPrevious() {
            // carryForwardRate (15) < E.prev_carry_forward (20) -> "down"
            Map<String, Double> refData = Map.of("E.prev_carry_forward", 20.0);
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 15.0, 0, 0, refData);

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("down");
        }

        @Test
        void buildMetrics_carryTrend_flatWhenRateEqualsPrevious() {
            Map<String, Double> refData = Map.of("E.prev_carry_forward", 20.0);
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 20.0, 0, 0, refData);

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("flat");
        }

        @Test
        void buildMetrics_carryTrend_missingKeyDefaultsToZero_rateAboveZeroIsUp() {
            // No "E.prev_carry_forward" key -> getOrDefault returns 0.0
            // carryForwardRate = 10 > 0.0 -> "up"
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 10.0, 0, 0, Map.of());

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("up");
        }

        @Test
        void buildMetrics_carryTrend_missingKeyDefaultsToZero_rateZeroIsFlat() {
            // No key -> default 0.0; carryForwardRate = 0.0 == 0.0 -> "flat"
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0.0, 0, 0, Map.of());

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("flat");
        }

        @Test
        void buildMetrics_carryTrend_missingKeyDefaultsToZero_rateBelowZeroIsDown() {
            // carryForwardRate = -1 is theoretically impossible in practice, but verifies
            // the comparison logic handles negative values correctly.
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, -1.0, 0, 0, Map.of());

            BriefingMetric carry = findMetricByKey(builder.buildMetrics(ctx), "carry");

            assertThat(carry.trend()).isEqualTo("down");
        }

        @Test
        void buildMetrics_coverageAndCompletionAndDrift_trendIsNull() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(70, 65, 20, 3, 80,
                    Map.of("E.prev_carry_forward", 15.0));

            List<BriefingMetric> metrics = builder.buildMetrics(ctx);

            assertThat(findMetricByKey(metrics, "coverage").trend()).isNull();
            assertThat(findMetricByKey(metrics, "completion").trend()).isNull();
            assertThat(findMetricByKey(metrics, "drift").trend()).isNull();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Edge cases — extreme and boundary values
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class EdgeCases {

        @Test
        void buildCitations_oneHundredPercentValues_formatWithoutFraction() {
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of(), 100.0, 100.0, 100.0, 0, 100.0, 50);

            List<BriefingCitation> citations = builder.buildCitations(ctx);

            assertThat(findById(citations, "c1").label()).isEqualTo("Strategic alignment: 100%");
            assertThat(findById(citations, "c2").label()).isEqualTo("Rally Cry Coverage: 100%");
            assertThat(findById(citations, "c3").label()).isEqualTo("Carry-Forward Rate: 100%");
        }

        @Test
        void buildMetrics_largeRoundingBoundary_roundsCorrectly() {
            // 49.5 rounds to 50 with Math.round
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of("E.prev_carry_forward", 0.0), 0, 0, 49.5, 0, 49.5, 0);

            List<BriefingMetric> metrics = builder.buildMetrics(ctx);

            assertThat(findMetricByKey(metrics, "coverage").value()).isCloseTo(50.0, within(0.001));
            assertThat(findMetricByKey(metrics, "carry").value()).isCloseTo(50.0, within(0.001));
        }

        @Test
        void buildResponse_narrativeIsEmptyString_isAccepted() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(50, 50, 10, 1, 60,
                    Map.of("E.prev_carry_forward", 10.0));

            BriefingResponse response = builder.buildResponse("", List.of(), ctx);

            assertThat(response.narrative()).isEmpty();
        }

        @Test
        void buildCitations_zeroDriftCount_rendersZero() {
            BriefingDataGatherer.BriefingDataContext ctx = ctxWith(0, 0, 0, 0, 0, Map.of());

            BriefingCitation c4 = findById(builder.buildCitations(ctx), "c4");

            assertThat(c4.label()).isEqualTo("Active Drift Signals: 0");
            assertThat(c4.detail()).isEqualTo("Observatory Drift Detection");
        }

        @Test
        void buildMetrics_emptyReferenceData_usesDefaultZeroForCarryComparison() {
            // An entirely empty map — all getOrDefault calls fall back to 0.0
            BriefingDataGatherer.BriefingDataContext ctx = new BriefingDataGatherer.BriefingDataContext(
                    "p", Map.of(), 70.0, 60.0, 25.0, 2, 80.0, 30);

            // Should not throw; carry trend should be "up" (25 > 0)
            List<BriefingMetric> metrics = builder.buildMetrics(ctx);

            assertThat(metrics).hasSize(4);
            assertThat(findMetricByKey(metrics, "carry").trend()).isEqualTo("up");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Convenience factory that keeps the common fields concise. The referenceData
     * map is supplied explicitly so individual tests can control trend logic.
     */
    private static BriefingDataGatherer.BriefingDataContext ctxWith(
            double alignmentPct,
            double completionRate,
            double carryForwardRate,
            int driftCount,
            double rallyCryCoveragePct,
            Map<String, Double> referenceData) {

        return new BriefingDataGatherer.BriefingDataContext(
                "test-prompt",
                referenceData,
                alignmentPct,
                completionRate,
                carryForwardRate,
                driftCount,
                rallyCryCoveragePct,
                /* totalCommitments */ 0
        );
    }

    private static BriefingCitation findById(List<BriefingCitation> citations, String id) {
        return citations.stream()
                .filter(c -> id.equals(c.id()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No citation with id=" + id));
    }

    private static BriefingMetric findMetricByKey(List<BriefingMetric> metrics, String key) {
        return metrics.stream()
                .filter(m -> key.equals(m.key()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No metric with key=" + key));
    }
}
