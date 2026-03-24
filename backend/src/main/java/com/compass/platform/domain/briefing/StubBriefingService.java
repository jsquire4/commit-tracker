package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.BriefingCitation;
import com.compass.platform.domain.briefing.dto.BriefingMetric;
import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.BriefingSuggestion;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.briefing.dto.ChatResponse;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.AnalyticsService;
import com.compass.platform.domain.observatory.DriftDetectionService;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Fallback implementation of {@link BriefingService} that gathers real metrics
 * and composes a templated narrative without an LLM call.
 *
 * <p>Active only when no LLM API key is configured (i.e., {@link LlmBriefingService}
 * is not instantiated). Produces deterministic output from analytics data.
 */
@Service
@Transactional(readOnly = true)
public class StubBriefingService implements BriefingService {

    private static final Logger log = LoggerFactory.getLogger(StubBriefingService.class);

    private final AnalyticsService analyticsService;
    private final DriftDetectionService driftDetectionService;
    private final CycleRepository cycleRepository;
    private final CommitmentRepository commitmentRepository;

    public StubBriefingService(AnalyticsService analyticsService,
                               DriftDetectionService driftDetectionService,
                               CycleRepository cycleRepository,
                               CommitmentRepository commitmentRepository) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
    }

    @Override
    public BriefingResponse generateBriefing(UUID orgId, UUID cycleId) {
        log.debug("generateBriefing orgId={} cycleId={}", orgId, cycleId);

        // 1. Gather alignment data
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, 12);
        double alignmentPct = 0.0;
        int totalCommitments = 0;
        if (!alignmentTrend.isEmpty()) {
            AlignmentDataPoint latest = alignmentTrend.get(alignmentTrend.size() - 1);
            alignmentPct = latest.strategicPct();
            totalCommitments = latest.totalCommitments();
        }

        // 2. Gather completion/carry-forward data
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, 12);
        double completionRate = 0.0;
        double carryForwardRate = 0.0;
        if (!completionTrend.isEmpty()) {
            CompletionDataPoint latest = completionTrend.get(completionTrend.size() - 1);
            completionRate = latest.completionRate();
            carryForwardRate = latest.carryForwardRate();
        }

        // 3. Gather drift signals
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int driftCount = 0;
        if (driftReport != null && driftReport.signals() != null) {
            driftCount = driftReport.signals().size();
        }

        // 4. Compute rally cry coverage: % of commitments linked to a rally cry
        // Load commitments for the target cycle (or the most recent cycle if cycleId is null)
        double rallyCryCoveragePct = 0.0;
        int unlinkedCount = 0;
        UUID resolvedCycleId = cycleId;
        if (resolvedCycleId == null) {
            List<Cycle> recentCycles = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);
            if (!recentCycles.isEmpty()) {
                resolvedCycleId = recentCycles.get(0).getId();
            }
        }
        if (resolvedCycleId != null) {
            List<Commitment> cycleCommitments = commitmentRepository
                    .findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, resolvedCycleId);
            int cycleTotal = cycleCommitments.size();
            long linkedToRallyCry = cycleCommitments.stream()
                    .filter(c -> c.getRallyCry() != null)
                    .count();
            rallyCryCoveragePct = cycleTotal > 0 ? (linkedToRallyCry * 100.0 / cycleTotal) : 0.0;
            unlinkedCount = cycleTotal - (int) linkedToRallyCry;
        }

        // 5. Determine carry-forward trend
        String carryTrend = describeCarryForwardTrend(completionTrend);

        // 6. Compose narrative from template
        String narrative = String.format(
                "Strategic alignment is at %.0f%% this cycle. " +
                "Rally cry coverage stands at %.0f%% with %d unlinked commitments. " +
                "Carry-forward rate is %.0f%% — %s. " +
                "%d active drift signal%s detected.",
                alignmentPct,
                rallyCryCoveragePct,
                unlinkedCount,
                carryForwardRate,
                carryTrend,
                driftCount,
                driftCount == 1 ? "" : "s"
        );

        // 7. Build suggestions from data
        List<BriefingSuggestion> suggestions = buildSuggestions(
                rallyCryCoveragePct, carryForwardRate, driftCount, driftReport);

        // 8. Build citations
        List<BriefingCitation> citations = buildCitations(
                alignmentPct, rallyCryCoveragePct, carryForwardRate, driftCount);

        List<BriefingMetric> metrics = buildMetrics(alignmentPct, rallyCryCoveragePct, carryForwardRate, completionRate, driftCount);

        return new BriefingResponse("Weekly Intelligence Summary", narrative, suggestions, citations, metrics, Instant.now());
    }

    @Override
    public String generateWeekNarrative(UUID orgId, UUID cycleId) {
        log.debug("generateWeekNarrative orgId={} cycleId={} (stub)", orgId, cycleId);

        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, 12);
        double completionRate = completionTrend.isEmpty() ? 0.0
                : completionTrend.get(completionTrend.size() - 1).completionRate();
        double carryForwardRate = completionTrend.isEmpty() ? 0.0
                : completionTrend.get(completionTrend.size() - 1).carryForwardRate();

        return String.format(
                "Week closed with a %.0f%% completion rate and a %.0f%% carry-forward rate. " +
                "No LLM configured — narrative generated from template.",
                completionRate, carryForwardRate);
    }

    @Override
    public String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId) {
        log.debug("generateTeamSummary orgId={} cycleId={} managerId={} (stub)", orgId, cycleId, managerId);
        return String.format(
                "Team summary for manager %s is unavailable — no LLM configured.", managerId);
    }

    @Override
    public ChatResponse generateChat(UUID orgId, List<ChatMessage> messages) {
        log.debug("generateChat orgId={} messageCount={}", orgId, messages.size());

        String lastMessage = messages.isEmpty() ? "" : messages.get(messages.size() - 1).content();

        String response = String.format(
                "I've noted your question: \"%s\". " +
                "This is currently a stub response — the AI briefing assistant is not yet active. " +
                "For now, please check the relevant section of the briefing dashboard for details " +
                "on alignment, coverage, carry-forward rates, and drift signals.",
                truncate(lastMessage, 100)
        );

        return new ChatResponse(response, Instant.now());
    }

    // ═══════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute the percentage of commitments that lack a CHESS category from the latest alignment data point.
     * The sum of all category percentages equals 100% when all commitments are categorized;
     * any gap from 100% represents uncategorized work.
     */
    private double computeUncategorizedPct(List<AlignmentDataPoint> trend) {
        if (trend.isEmpty()) {
            return 100.0;
        }
        AlignmentDataPoint latest = trend.get(trend.size() - 1);
        double categorizedPct = latest.strategicPct() + latest.operationalPct()
                + latest.defensivePct() + latest.capabilityBuildingPct();
        return Math.max(0.0, 100.0 - categorizedPct);
    }

    /**
     * Describe the carry-forward trend by comparing the two most recent data points.
     */
    private String describeCarryForwardTrend(List<CompletionDataPoint> trend) {
        if (trend.size() < 2) {
            return "insufficient data to determine trend";
        }
        double current = trend.get(trend.size() - 1).carryForwardRate();
        double previous = trend.get(trend.size() - 2).carryForwardRate();
        double delta = current - previous;

        if (Math.abs(delta) < 1.0) {
            return "holding steady";
        } else if (delta > 0) {
            return String.format("up %.0f pp from last cycle", delta);
        } else {
            return String.format("down %.0f pp from last cycle", Math.abs(delta));
        }
    }

    /**
     * Build actionable suggestions derived from the briefing data.
     */
    private List<BriefingSuggestion> buildSuggestions(double coveragePct, double carryForwardRate,
                                                       int driftCount, DriftReport driftReport) {
        List<BriefingSuggestion> suggestions = new ArrayList<>();

        int idx = 0;
        if (coveragePct < 80.0) {
            suggestions.add(new BriefingSuggestion("s" + (++idx),
                    String.format("Rally cry coverage is at %.0f%%. Review unlinked commitments to improve strategic alignment visibility.", coveragePct),
                    "REVIEW_COVERAGE"
            ));
        }

        if (carryForwardRate > 20.0) {
            suggestions.add(new BriefingSuggestion("s" + (++idx),
                    String.format("Carry-forward rate is %.0f%%. Consider a displacement review to address recurring incomplete work.", carryForwardRate),
                    "DISPLACEMENT_REVIEW"
            ));
        }

        if (driftCount > 0 && driftReport != null && driftReport.signals() != null) {
            String signalSummary = driftReport.signals().stream()
                    .limit(3)
                    .map(s -> String.format("%s (%s, %s)", s.unitName(), s.metric(), s.severity()))
                    .collect(Collectors.joining("; "));
            suggestions.add(new BriefingSuggestion("s" + (++idx),
                    String.format("%d drift signal%s detected: %s", driftCount, driftCount == 1 ? "" : "s", signalSummary),
                    "INVESTIGATE_DRIFT"
            ));
        }

        if (suggestions.isEmpty()) {
            suggestions.add(new BriefingSuggestion("s1",
                    "All key metrics are within healthy ranges. No immediate action required.",
                    "NO_ACTION"
            ));
        }

        return suggestions;
    }

    /**
     * Build KPI metrics for the BriefingMetricsStrip, mirroring the logic in LlmBriefingService.
     */
    private List<BriefingMetric> buildMetrics(double alignmentPct, double rallyCryCoveragePct,
                                               double carryForwardRate, double completionRate,
                                               int driftCount) {
        return List.of(
                new BriefingMetric("alignment", "Rally Cry Coverage", Math.round(rallyCryCoveragePct), "%", null),
                new BriefingMetric("carry", "Carry-Forward Rate", Math.round(carryForwardRate), "%", null),
                new BriefingMetric("completion", "Completion Rate", Math.round(completionRate), "%", null),
                new BriefingMetric("drift", "Active Drift Signals", driftCount, null, null)
        );
    }

    /**
     * Build citations linking each metric to its data source and API endpoint.
     */
    private List<BriefingCitation> buildCitations(double alignmentPct, double coveragePct,
                                                    double carryForwardRate, int driftCount) {
        List<BriefingCitation> citations = new ArrayList<>();

        citations.add(new BriefingCitation("c1",
                String.format("Strategic alignment: %.0f%%", alignmentPct),
                "Observatory Analytics — Alignment Trend",
                "View breakdown"));

        citations.add(new BriefingCitation("c2",
                String.format("Rally Cry Coverage: %.0f%%", coveragePct),
                "Commitments linked to a Rally Cry / total commitments",
                "View details"));

        citations.add(new BriefingCitation("c3",
                String.format("Carry-Forward Rate: %.0f%%", carryForwardRate),
                "From reconciliation records",
                "View list"));

        citations.add(new BriefingCitation("c4",
                String.format("Active Drift Signals: %d", driftCount),
                "Observatory Drift Detection",
                "View signals"));

        return citations;
    }

    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        return text.length() <= maxLength ? text : text.substring(0, maxLength) + "...";
    }
}
