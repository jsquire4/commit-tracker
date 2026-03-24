package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.BriefingDataGatherer.BriefingDataContext;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class BriefingPromptBuilderTest {

    private BriefingPromptBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new BriefingPromptBuilder();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // computeTrendDirection
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class ComputeTrendDirection {

        @Test
        void emptyArray_returnsFlat() {
            assertThat(builder.computeTrendDirection(new double[]{})).isEqualTo("flat");
        }

        @Test
        void singleElement_returnsFlat() {
            assertThat(builder.computeTrendDirection(new double[]{50.0})).isEqualTo("flat");
        }

        @Test
        void twoElements_deltaExactlyTwoPointZero_returnsFlat() {
            // delta = 52 - 50 = 2.0, boundary is exclusive (must be > 2.0)
            assertThat(builder.computeTrendDirection(new double[]{50.0, 52.0})).isEqualTo("flat");
        }

        @Test
        void twoElements_deltaExactlyNegativeTwoPointZero_returnsFlat() {
            // delta = 48 - 50 = -2.0, boundary is exclusive (must be < -2.0)
            assertThat(builder.computeTrendDirection(new double[]{50.0, 48.0})).isEqualTo("flat");
        }

        @Test
        void twoElements_deltaJustAboveTwo_returnsImproving() {
            // delta = 52.01 - 50 = 2.01 > 2.0
            assertThat(builder.computeTrendDirection(new double[]{50.0, 52.01})).isEqualTo("improving");
        }

        @Test
        void twoElements_deltaJustBelowNegativeTwo_returnsDeclining() {
            // delta = 47.99 - 50 = -2.01 < -2.0
            assertThat(builder.computeTrendDirection(new double[]{50.0, 47.99})).isEqualTo("declining");
        }

        @Test
        void evenElements_secondHalfMuchHigher_returnsImproving() {
            // first half avg = (10 + 20) / 2 = 15; second half avg = (50 + 60) / 2 = 55; delta = 40
            assertThat(builder.computeTrendDirection(new double[]{10.0, 20.0, 50.0, 60.0}))
                    .isEqualTo("improving");
        }

        @Test
        void evenElements_secondHalfMuchLower_returnsDeclining() {
            // first half avg = (60 + 50) / 2 = 55; second half avg = (20 + 10) / 2 = 15; delta = -40
            assertThat(builder.computeTrendDirection(new double[]{60.0, 50.0, 20.0, 10.0}))
                    .isEqualTo("declining");
        }

        @Test
        void evenElements_halvesSimilar_returnsFlat() {
            // first half avg = (50 + 51) / 2 = 50.5; second half avg = (50 + 51) / 2 = 50.5; delta = 0
            assertThat(builder.computeTrendDirection(new double[]{50.0, 51.0, 50.0, 51.0}))
                    .isEqualTo("flat");
        }

        @Test
        void oddElements_splitsCorrectly_returnsImproving() {
            // length=3, half=1; firstHalfAvg = values[0]/1 = 10; secondHalfAvg = (40+50)/2 = 45; delta = 35
            assertThat(builder.computeTrendDirection(new double[]{10.0, 40.0, 50.0}))
                    .isEqualTo("improving");
        }

        @Test
        void oddElements_splitsCorrectly_returnsDeclining() {
            // length=3, half=1; firstHalfAvg = 50; secondHalfAvg = (10+5)/2 = 7.5; delta = -42.5
            assertThat(builder.computeTrendDirection(new double[]{50.0, 10.0, 5.0}))
                    .isEqualTo("declining");
        }

        @Test
        void constantValues_returnsFlat() {
            assertThat(builder.computeTrendDirection(new double[]{40.0, 40.0, 40.0, 40.0, 40.0}))
                    .isEqualTo("flat");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildWeekTemplateFallback
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildWeekTemplateFallback {

        @Test
        void defensivePctAbove15_sentence1MentionsElevatedDefensive() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 30.0, 25.0, 16.0, 10.0, 75.0, 20);
            CompletionDataPoint completion = completionPoint("W1", 70.0, 15.0, 10.0);

            String result = builder.buildWeekTemplateFallback(alignment, completion);

            assertThat(result).contains("Defensive work was elevated at 16%");
            assertThat(result).contains("pulling capacity away from strategic initiatives");
        }

        @Test
        void defensivePctExactly15_usesStrategicSentence() {
            // boundary is exclusive: > 15 triggers the defensive branch; == 15 falls through
            AlignmentDataPoint alignment = alignmentPoint("W1", 40.0, 25.0, 15.0, 10.0, 80.0, 20);
            CompletionDataPoint completion = completionPoint("W1", 70.0, 15.0, 10.0);

            String result = builder.buildWeekTemplateFallback(alignment, completion);

            assertThat(result).contains("Strategic work made up 40%");
            assertThat(result).contains("balanced mix");
        }

        @Test
        void defensivePctBelow15_sentence1MentionsStrategicPct() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 42.0, 25.0, 10.0, 8.0, 80.0, 30);
            CompletionDataPoint completion = completionPoint("W1", 68.0, 12.0, 8.0);

            String result = builder.buildWeekTemplateFallback(alignment, completion);

            assertThat(result).contains("Strategic work made up 42%");
        }

        @Test
        void withCompletion_sentence2ContainsCompletionAndCarryForward() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 40.0, 25.0, 10.0, 8.0, 80.0, 20);
            CompletionDataPoint completion = completionPoint("W1", 73.0, 18.0, 5.0);

            String result = builder.buildWeekTemplateFallback(alignment, completion);

            assertThat(result).contains("Completion rate was 73%");
            assertThat(result).contains("carry-forward rate stood at 18%");
        }

        @Test
        void nullCompletion_sentence2UsesRallyCoverage() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 40.0, 25.0, 10.0, 8.0, 65.0, 20);

            String result = builder.buildWeekTemplateFallback(alignment, null);

            assertThat(result).contains("Rally cry coverage was at 65%");
        }

        @Test
        void result_isNonEmpty() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 35.0, 20.0, 20.0, 10.0, 70.0, 25);
            CompletionDataPoint completion = completionPoint("W1", 60.0, 20.0, 10.0);

            assertThat(builder.buildWeekTemplateFallback(alignment, completion)).isNotBlank();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildBriefingFallback
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildBriefingFallback {

        @Test
        void containsAlignmentPct() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 3.0, 15.0, 2, 2);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("41%");
        }

        @Test
        void containsRallyCryCoveragePct() {
            BriefingDataContext ctx = briefingCtx(41.0, 78.0, 5.0, 15.0, 2, 2);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("78%");
        }

        @Test
        void containsUnlinkedCountFromReferenceData() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 7.0, 15.0, 2, 2);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("7 unlinked commitments");
        }

        @Test
        void containsCarryForwardRate() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 3.0, 22.0, 2, 2);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("22%");
        }

        @Test
        void driftCountOne_singularSignal() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 3.0, 15.0, 1, 1);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("1 active drift signal detected");
            assertThat(result).doesNotContain("signals");
        }

        @Test
        void driftCountZero_pluralSignals() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 3.0, 15.0, 0, 0);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("0 active drift signals detected");
        }

        @Test
        void driftCountMultiple_pluralSignals() {
            BriefingDataContext ctx = briefingCtx(41.0, 80.0, 3.0, 15.0, 5, 5);

            String result = builder.buildBriefingFallback(ctx);

            assertThat(result).contains("5 active drift signals detected");
        }

        @Test
        void result_isDeterministicAcrossCalls() {
            BriefingDataContext ctx = briefingCtx(38.0, 75.0, 4.0, 20.0, 3, 3);

            String first  = builder.buildBriefingFallback(ctx);
            String second = builder.buildBriefingFallback(ctx);

            assertThat(first).isEqualTo(second);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildProgramSummaryFallback
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildProgramSummaryFallback {

        @Test
        void containsWeekCount() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "flat", 2);

            assertThat(result).contains("8 weeks");
        }

        @Test
        void containsAvgStrategicPct() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "flat", 2);

            assertThat(result).contains("40%");
        }

        @Test
        void containsAlignTrendDir() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "flat", 2);

            assertThat(result).contains("improving");
        }

        @Test
        void containsAvgCompletionRate() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "flat", 2);

            assertThat(result).contains("65%");
        }

        @Test
        void containsCompletionTrendDir() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "declining", 2);

            assertThat(result).contains("declining");
        }

        @Test
        void containsAvgCarryForwardRate() {
            String result = builder.buildProgramSummaryFallback(8, 40.0, 65.0, 14.0, "improving", "flat", 2);

            assertThat(result).contains("14%");
        }

        @Test
        void driftCountOne_singularSignal() {
            String result = builder.buildProgramSummaryFallback(4, 40.0, 65.0, 14.0, "flat", "flat", 1);

            assertThat(result).contains("1 active drift signal");
            assertThat(result).doesNotContain("signals");
        }

        @Test
        void driftCountZero_pluralSignals() {
            String result = builder.buildProgramSummaryFallback(4, 40.0, 65.0, 14.0, "flat", "flat", 0);

            assertThat(result).contains("0 active drift signals");
        }

        @Test
        void driftCountMultiple_pluralSignals() {
            String result = builder.buildProgramSummaryFallback(4, 40.0, 65.0, 14.0, "flat", "flat", 3);

            assertThat(result).contains("3 active drift signals");
        }

        @Test
        void result_isNonEmpty() {
            assertThat(builder.buildProgramSummaryFallback(6, 38.0, 60.0, 18.0, "flat", "flat", 0))
                    .isNotBlank();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildWeekNarrativePrompt
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildWeekNarrativePrompt {

        @Test
        void containsCycleLabel() {
            AlignmentDataPoint alignment = alignmentPoint("Week 12", 40.0, 25.0, 10.0, 8.0, 80.0, 30);
            CompletionDataPoint completion = completionPoint("Week 12", 70.0, 15.0, 8.0);

            String result = builder.buildWeekNarrativePrompt(alignment, completion);

            assertThat(result).contains("Week 12");
        }

        @Test
        void containsAllCommitmentCategories() {
            AlignmentDataPoint alignment = alignmentPoint("W3", 35.0, 22.0, 12.0, 9.0, 75.0, 50);

            String result = builder.buildWeekNarrativePrompt(alignment, null);

            assertThat(result)
                    .contains("Strategic")
                    .contains("Operational")
                    .contains("Defensive")
                    .contains("Capability Building");
        }

        @Test
        void withCompletion_containsExecutionSection() {
            AlignmentDataPoint alignment = alignmentPoint("W3", 35.0, 22.0, 12.0, 9.0, 75.0, 50);
            CompletionDataPoint completion = completionPoint("W3", 68.0, 17.0, 9.0);

            String result = builder.buildWeekNarrativePrompt(alignment, completion);

            assertThat(result).contains("EXECUTION");
            assertThat(result).contains("68.0%");
            assertThat(result).contains("17.0%");
        }

        @Test
        void nullCompletion_doesNotContainExecutionSection() {
            AlignmentDataPoint alignment = alignmentPoint("W3", 35.0, 22.0, 12.0, 9.0, 75.0, 50);

            String result = builder.buildWeekNarrativePrompt(alignment, null);

            assertThat(result).doesNotContain("EXECUTION");
        }

        @Test
        void containsTotalCommitments() {
            AlignmentDataPoint alignment = alignmentPoint("W5", 35.0, 22.0, 12.0, 9.0, 75.0, 47);

            String result = builder.buildWeekNarrativePrompt(alignment, null);

            assertThat(result).contains("47");
        }

        @Test
        void result_isNonEmpty() {
            AlignmentDataPoint alignment = alignmentPoint("W1", 30.0, 20.0, 15.0, 8.0, 70.0, 20);

            assertThat(builder.buildWeekNarrativePrompt(alignment, null)).isNotBlank();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // buildProgramSummaryPrompt
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class BuildProgramSummaryPrompt {

        @Test
        void containsOrgName() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("Meridian Corp");
        }

        @Test
        void containsWeekCount() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("12 weeks");
        }

        @Test
        void containsAlignmentRefTag() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("[P.avg_strategic]");
        }

        @Test
        void containsCompletionRefTag() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("[P.avg_completion]");
        }

        @Test
        void containsCarryForwardRefTag() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("[P.avg_carry]");
        }

        @Test
        void containsDriftRefTag() {
            String result = builder.buildProgramSummaryPrompt(
                    "Meridian Corp", 12, 40.0, "improving", 65.0, "flat", 14.0, 3);

            assertThat(result).contains("[P.drift]");
        }

        @Test
        void result_isNonEmpty() {
            assertThat(builder.buildProgramSummaryPrompt(
                    "Acme", 4, 35.0, "flat", 60.0, "declining", 20.0, 0))
                    .isNotBlank();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // System prompt accessors
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    class SystemPromptAccessors {

        @Test
        void weekNarrativeSystemPrompt_returnsNonNull() {
            assertThat(builder.weekNarrativeSystemPrompt()).isNotNull();
        }

        @Test
        void weekNarrativeSystemPrompt_isNotEmpty() {
            assertThat(builder.weekNarrativeSystemPrompt()).isNotBlank();
        }

        @Test
        void briefingSystemPrompt_returnsNonNull() {
            assertThat(builder.briefingSystemPrompt()).isNotNull();
        }

        @Test
        void briefingSystemPrompt_isNotEmpty() {
            assertThat(builder.briefingSystemPrompt()).isNotBlank();
        }

        @Test
        void chatSystemPrompt_returnsNonNull() {
            assertThat(builder.chatSystemPrompt()).isNotNull();
        }

        @Test
        void chatSystemPrompt_isNotEmpty() {
            assertThat(builder.chatSystemPrompt()).isNotBlank();
        }

        @Test
        void programSummarySystemPrompt_replacesNPlaceholder() {
            String result = builder.programSummarySystemPrompt(8);

            assertThat(result).contains("8");
            assertThat(result).doesNotContain("{N}");
        }

        @Test
        void programSummarySystemPrompt_differentWeekCounts_reflectedInPrompt() {
            String four  = builder.programSummarySystemPrompt(4);
            String twelve = builder.programSummarySystemPrompt(12);

            assertThat(four).contains("4");
            assertThat(twelve).contains("12");
            assertThat(four).isNotEqualTo(twelve);
        }

        @Test
        void teamSummarySystemPrompt_returnsNonNull() {
            assertThat(builder.teamSummarySystemPrompt()).isNotNull();
        }

        @Test
        void teamSummarySystemPrompt_isNotEmpty() {
            assertThat(builder.teamSummarySystemPrompt()).isNotBlank();
        }

        @Test
        void briefingSystemPrompt_containsOutputFormatInstruction() {
            assertThat(builder.briefingSystemPrompt()).contains("OUTPUT FORMAT");
        }

        @Test
        void teamSummarySystemPrompt_containsOutputFormatInstruction() {
            assertThat(builder.teamSummarySystemPrompt()).contains("OUTPUT FORMAT");
        }

        @Test
        void weekNarrativeSystemPrompt_forbidsMarkdown() {
            assertThat(builder.weekNarrativeSystemPrompt()).contains("plain text");
        }

        @Test
        void chatSystemPrompt_containsCurrentDataReference() {
            assertThat(builder.chatSystemPrompt()).contains("CURRENT DATA");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static AlignmentDataPoint alignmentPoint(String label,
                                                      double strategic,
                                                      double operational,
                                                      double defensive,
                                                      double capability,
                                                      double rallyCoverage,
                                                      int total) {
        return new AlignmentDataPoint(
                UUID.randomUUID(), label, Instant.now(),
                strategic, operational, defensive, capability, rallyCoverage, total);
    }

    private static CompletionDataPoint completionPoint(String label,
                                                        double completionRate,
                                                        double carryForwardRate,
                                                        double notStartedRate) {
        return new CompletionDataPoint(
                UUID.randomUUID(), label, Instant.now(),
                completionRate, carryForwardRate, notStartedRate, 20, 14);
    }

    /**
     * Builds a minimal {@link BriefingDataContext} for fallback tests.
     * {@code unlinked} is placed in the reference map under {@code R.unlinked};
     * {@code driftCountRef} is placed under {@code D.count}.
     */
    private static BriefingDataContext briefingCtx(double alignmentPct,
                                                    double rallyCryCoveragePct,
                                                    double unlinked,
                                                    double carryForwardRate,
                                                    int driftCount,
                                                    double driftCountRef) {
        Map<String, Double> refData = new LinkedHashMap<>();
        refData.put("R.unlinked", unlinked);
        refData.put("D.count", driftCountRef);

        return new BriefingDataContext(
                "user-prompt",
                refData,
                alignmentPct,
                70.0,               // completionRate (not used by fallback)
                carryForwardRate,
                driftCount,
                rallyCryCoveragePct,
                50                  // totalCommitments (not used by fallback)
        );
    }
}
