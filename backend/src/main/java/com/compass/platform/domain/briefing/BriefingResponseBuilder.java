package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.*;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Builds deterministic response components for briefings.
 * Extracted from LlmBriefingService to reduce class size.
 */
@Component
public class BriefingResponseBuilder {

    public BriefingResponse buildResponse(String narrative, List<BriefingSuggestion> suggestions,
                                          BriefingDataGatherer.BriefingDataContext ctx) {
        List<BriefingCitation> citations = buildCitations(ctx);
        List<BriefingMetric> metrics = buildMetrics(ctx);
        return new BriefingResponse("Weekly Intelligence Summary", narrative, suggestions, citations, metrics, Instant.now());
    }

    public BriefingResponse buildResponseFromCache(GeneratedNarrative cached, List<BriefingSuggestion> suggestions,
                                                    BriefingDataGatherer.BriefingDataContext ctx) {
        List<BriefingCitation> citations = buildCitations(ctx);
        List<BriefingMetric> metrics = buildMetrics(ctx);
        return new BriefingResponse("Weekly Intelligence Summary", cached.getContent(), suggestions, citations, metrics, cached.getGeneratedAt());
    }

    public BriefingResponse emptyBriefing() {
        return new BriefingResponse("Weekly Intelligence Summary",
                "No reconciled cycles available for briefing.", List.of(), List.of(), List.of(), Instant.now());
    }

    public List<BriefingCitation> buildCitations(BriefingDataGatherer.BriefingDataContext ctx) {
        List<BriefingCitation> citations = new ArrayList<>();
        citations.add(new BriefingCitation("c1",
                String.format("Strategic alignment: %.0f%%", ctx.alignmentPct()),
                "Computed from " + ctx.totalCommitments() + " commitments",
                "View breakdown"));
        citations.add(new BriefingCitation("c2",
                String.format("Rally Cry Coverage: %.0f%%", ctx.rallyCryCoveragePct()),
                "Commitments linked to a Rally Cry / total commitments",
                "View details"));
        citations.add(new BriefingCitation("c3",
                String.format("Carry-Forward Rate: %.0f%%", ctx.carryForwardRate()),
                "From reconciliation records",
                "View list"));
        citations.add(new BriefingCitation("c4",
                String.format("Active Drift Signals: %d", ctx.driftCount()),
                "Observatory Drift Detection",
                "View signals"));
        return citations;
    }

    public List<BriefingMetric> buildMetrics(BriefingDataGatherer.BriefingDataContext ctx) {
        String alignTrend = ctx.referenceData().getOrDefault("A.delta", 0.0) > 0 ? "up"
                : ctx.referenceData().getOrDefault("A.delta", 0.0) < -1 ? "down" : "flat";
        String carryTrend = ctx.carryForwardRate() > ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "up"
                : ctx.carryForwardRate() < ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "down" : "flat";

        return List.of(
                new BriefingMetric("alignment", "Rally Cry Coverage", Math.round(ctx.rallyCryCoveragePct()), "%", alignTrend),
                new BriefingMetric("carry", "Carry-Forward Rate", Math.round(ctx.carryForwardRate()), "%", carryTrend),
                new BriefingMetric("completion", "Completion Rate", Math.round(ctx.completionRate()), "%", null),
                new BriefingMetric("drift", "Active Drift Signals", ctx.driftCount(), null, null)
        );
    }

    public String buildWeekNarrativePrompt(AlignmentDataPoint alignment, CompletionDataPoint completion) {
        StringBuilder sb = new StringBuilder();
        sb.append("Week: ").append(alignment.cycleLabel()).append("\n\n");
        sb.append("CHESS BREAKDOWN:\n");
        sb.append(String.format("- Strategic: %.1f%%\n", alignment.strategicPct()));
        sb.append(String.format("- Operational: %.1f%%\n", alignment.operationalPct()));
        sb.append(String.format("- Defensive: %.1f%%\n", alignment.defensivePct()));
        sb.append(String.format("- Capability Building: %.1f%%\n", alignment.capabilityBuildingPct()));
        double uncategorized = Math.max(0, 100 - alignment.strategicPct() - alignment.operationalPct()
                - alignment.defensivePct() - alignment.capabilityBuildingPct());
        sb.append(String.format("- Not Categorized: %.1f%%\n", uncategorized));
        sb.append(String.format("- Total commitments: %d\n\n", alignment.totalCommitments()));

        if (completion != null) {
            sb.append("EXECUTION:\n");
            sb.append(String.format("- Completion rate: %.1f%%\n", completion.completionRate()));
            sb.append(String.format("- Carry-forward rate: %.1f%%\n", completion.carryForwardRate()));
            sb.append(String.format("- Not started rate: %.1f%%\n", completion.notStartedRate()));
        }
        return sb.toString();
    }

    public String buildWeekTemplateFallback(AlignmentDataPoint alignment, CompletionDataPoint completion) {
        double defensivePct = alignment.defensivePct();
        String sentence1;
        if (defensivePct > 15) {
            sentence1 = String.format("Defensive work was elevated at %.0f%% this week, pulling capacity away from strategic initiatives.",
                    defensivePct);
        } else {
            sentence1 = String.format("Strategic work made up %.0f%% of commitments this week, with a balanced mix across operational and capability categories.",
                    alignment.strategicPct());
        }
        String sentence2;
        if (completion != null) {
            sentence2 = String.format("Completion rate was %.0f%% and carry-forward rate stood at %.0f%%.",
                    completion.completionRate(), completion.carryForwardRate());
        } else {
            sentence2 = String.format("Rally cry coverage was at %.0f%% for the week.", alignment.rallyCoveragePct());
        }
        return sentence1 + " " + sentence2;
    }

    public String buildTemplateFallback(BriefingDataGatherer.BriefingDataContext ctx) {
        return String.format(
                "Strategic alignment is at %.0f%% this cycle. " +
                "Rally cry coverage stands at %.0f%% with %.0f unlinked commitments. " +
                "Carry-forward rate is %.0f%%. " +
                "%.0f active drift signal%s detected.",
                ctx.alignmentPct(),
                ctx.rallyCryCoveragePct(),
                ctx.referenceData().get("R.unlinked"),
                ctx.carryForwardRate(),
                ctx.referenceData().get("D.count"),
                ctx.driftCount() == 1 ? "" : "s");
    }

    public String buildProgramSummaryFallback(int weekCount, double avgStrategicPct,
                                               double avgCompletionRate, double avgCarryForwardRate,
                                               String alignTrendDir, String completionTrendDir,
                                               int driftCount) {
        return String.format(
                "Over the past %d weeks, the program has maintained an average strategic allocation of %.0f%% " +
                "(%s) with a %.0f%% completion rate (%s). Carry-forward rate averages %.0f%%. " +
                "%d active drift signal%s.",
                weekCount, avgStrategicPct, alignTrendDir,
                avgCompletionRate, completionTrendDir,
                avgCarryForwardRate, driftCount, driftCount == 1 ? "" : "s");
    }
}
