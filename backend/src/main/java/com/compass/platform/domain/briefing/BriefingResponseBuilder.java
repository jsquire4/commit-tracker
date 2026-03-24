package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.*;
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
}
