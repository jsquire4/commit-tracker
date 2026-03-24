package com.compass.platform.domain.briefing;

import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.observatory.AnalyticsService;
import com.compass.platform.domain.observatory.DriftDetectionService;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gathers all data needed for LLM briefing generation.
 * Extracted from LlmBriefingService to reduce class size.
 */
@Component
public class BriefingDataGatherer {

    private static final Logger log = LoggerFactory.getLogger(BriefingDataGatherer.class);

    private final AnalyticsService analyticsService;
    private final DriftDetectionService driftDetectionService;
    private final CommitmentRepository commitmentRepository;
    private final OrgRepository orgRepository;

    public BriefingDataGatherer(AnalyticsService analyticsService,
                                DriftDetectionService driftDetectionService,
                                CommitmentRepository commitmentRepository,
                                OrgRepository orgRepository) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.commitmentRepository = commitmentRepository;
        this.orgRepository = orgRepository;
    }

    /** All data needed to generate a briefing narrative. */
    public record BriefingDataContext(
            String userPrompt,
            Map<String, Double> referenceData,
            double alignmentPct,
            double completionRate,
            double carryForwardRate,
            int driftCount,
            double rallyCryCoveragePct,
            int totalCommitments
    ) {}

    public BriefingDataContext gatherData(UUID orgId, UUID cycleId) {
        // Alignment
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, 12);
        AlignmentDataPoint latest = alignmentTrend.isEmpty() ? null : alignmentTrend.get(alignmentTrend.size() - 1);
        AlignmentDataPoint previous = alignmentTrend.size() < 2 ? null : alignmentTrend.get(alignmentTrend.size() - 2);

        double strategicPct = latest != null ? latest.strategicPct() : 0;
        double operationalPct = latest != null ? latest.operationalPct() : 0;
        double defensivePct = latest != null ? latest.defensivePct() : 0;
        double capabilityPct = latest != null ? latest.capabilityBuildingPct() : 0;
        double uncategorizedPct = Math.max(0, 100 - strategicPct - operationalPct - defensivePct - capabilityPct);
        int totalCommitments = latest != null ? latest.totalCommitments() : 0;
        double prevStrategicPct = previous != null ? previous.strategicPct() : strategicPct;

        // Completion
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, 12);
        CompletionDataPoint latestCompletion = completionTrend.isEmpty() ? null : completionTrend.get(completionTrend.size() - 1);
        CompletionDataPoint prevCompletion = completionTrend.size() < 2 ? null : completionTrend.get(completionTrend.size() - 2);

        double completionRate = latestCompletion != null ? latestCompletion.completionRate() : 0;
        double carryForwardRate = latestCompletion != null ? latestCompletion.carryForwardRate() : 0;
        double notStartedRate = latestCompletion != null ? latestCompletion.notStartedRate() : 0;
        double prevCompletionRate = prevCompletion != null ? prevCompletion.completionRate() : completionRate;
        double prevCarryForwardRate = prevCompletion != null ? prevCompletion.carryForwardRate() : carryForwardRate;

        // Drift
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int driftCount = (driftReport != null && driftReport.signals() != null) ? driftReport.signals().size() : 0;

        // Rally cry coverage
        double rallyCryCoveragePct = 0;
        int unlinkedCount = 0;
        if (cycleId == null) {
            log.warn("cycleId is null for orgId={} — rally cry coverage data unavailable, reporting 0%", orgId);
        } else {
            List<Commitment> cycleCommitments = commitmentRepository
                    .findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);
            int cycleTotal = cycleCommitments.size();
            long linked = cycleCommitments.stream().filter(c -> c.getRallyCry() != null).count();
            rallyCryCoveragePct = cycleTotal > 0 ? (linked * 100.0 / cycleTotal) : 0;
            unlinkedCount = cycleTotal - (int) linked;
        }

        // Org name
        String orgName = orgRepository.findById(orgId).map(Org::getName).orElse("Organization");

        // Build reference data map
        Map<String, Double> refData = new LinkedHashMap<>();
        refData.put("A.strategic", strategicPct);
        refData.put("A.operational", operationalPct);
        refData.put("A.defensive", defensivePct);
        refData.put("A.capability", capabilityPct);
        refData.put("A.uncategorized", uncategorizedPct);
        refData.put("A.prev_strategic", prevStrategicPct);
        refData.put("A.delta", strategicPct - prevStrategicPct);
        refData.put("E.completion", completionRate);
        refData.put("E.carry_forward", carryForwardRate);
        refData.put("E.not_started", notStartedRate);
        refData.put("E.prev_completion", prevCompletionRate);
        refData.put("E.prev_carry_forward", prevCarryForwardRate);
        refData.put("R.coverage", rallyCryCoveragePct);
        refData.put("R.unlinked", (double) unlinkedCount);
        refData.put("D.count", (double) driftCount);
        refData.put("T.total", (double) totalCommitments);

        // Build tagged user prompt
        StringBuilder sb = new StringBuilder();
        sb.append("Generate an executive briefing for this cycle.\n\n");
        sb.append("ORG: ").append(orgName).append("\n");
        sb.append("TOTAL COMMITMENTS: ").append(totalCommitments).append(" [T.total]\n\n");
        sb.append("ALIGNMENT:\n");
        sb.append(String.format("- Strategic: %.1f%% [A.strategic]\n", strategicPct));
        sb.append(String.format("- Operational: %.1f%% [A.operational]\n", operationalPct));
        sb.append(String.format("- Defensive: %.1f%% [A.defensive]\n", defensivePct));
        sb.append(String.format("- Capability Building: %.1f%% [A.capability]\n", capabilityPct));
        sb.append(String.format("- Uncategorized: %.1f%% [A.uncategorized]\n", uncategorizedPct));
        sb.append(String.format("- Previous cycle strategic: %.1f%% [A.prev_strategic] (delta: %.1f pp [A.delta])\n\n",
                prevStrategicPct, strategicPct - prevStrategicPct));
        sb.append("EXECUTION:\n");
        sb.append(String.format("- Completion rate: %.1f%% [E.completion] (previous: %.1f%% [E.prev_completion])\n",
                completionRate, prevCompletionRate));
        sb.append(String.format("- Carry-forward rate: %.1f%% [E.carry_forward] (previous: %.1f%% [E.prev_carry_forward])\n",
                carryForwardRate, prevCarryForwardRate));
        sb.append(String.format("- Not started rate: %.1f%% [E.not_started]\n\n", notStartedRate));
        sb.append("RALLY CRY COVERAGE:\n");
        sb.append(String.format("- %.1f%% [R.coverage] of commitments linked to a rally cry\n", rallyCryCoveragePct));
        sb.append(String.format("- %d [R.unlinked] commitments unlinked\n\n", unlinkedCount));
        sb.append(String.format("DRIFT SIGNALS: %d [D.count] active\n", driftCount));
        if (driftReport != null && driftReport.signals() != null) {
            for (DriftSignal signal : driftReport.signals()) {
                sb.append(String.format("- %s (%s): %s %s — current %.1f, baseline %.1f, %d weeks\n",
                        signal.unitName(), signal.unitType(), signal.metric(), signal.severity(),
                        signal.currentValue(), signal.baselineValue(), signal.weekCount()));
            }
        }

        return new BriefingDataContext(
                sb.toString(), refData, strategicPct, completionRate, carryForwardRate,
                driftCount, rallyCryCoveragePct, totalCommitments);
    }
}
