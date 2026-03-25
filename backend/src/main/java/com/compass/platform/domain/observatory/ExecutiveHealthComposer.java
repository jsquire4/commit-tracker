package com.compass.platform.domain.observatory;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.TimeScope;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSeverity;
import com.compass.platform.domain.observatory.dto.ExecutiveHealthResponse;
import com.compass.platform.domain.observatory.dto.HealthGrade;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.OrgUnitHealth;
import com.compass.platform.domain.observatory.dto.TeamAlignmentTrend;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Composes the executive health response from multiple observatory services.
 *
 * <p>Aggregates alignment/completion trends, drift signals, integrity flags, and per-VP/Director
 * unit health into a single {@link ExecutiveHealthResponse}. Owns the grade-computation logic
 * so that both org-level and per-unit grades are evaluated against the same config thresholds.
 */
@Service
@Transactional(readOnly = true)
public class ExecutiveHealthComposer {

    private static final Logger log = LoggerFactory.getLogger(ExecutiveHealthComposer.class);

    private final AnalyticsService analyticsService;
    private final DriftDetectionService driftDetectionService;
    private final ObservatoryConfigRepository configRepository;
    private final OrgRepository orgRepository;
    private final AppUserRepository userRepository;

    public ExecutiveHealthComposer(AnalyticsService analyticsService,
                                   DriftDetectionService driftDetectionService,
                                   ObservatoryConfigRepository configRepository,
                                   OrgRepository orgRepository,
                                   AppUserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.configRepository = configRepository;
        this.orgRepository = orgRepository;
        this.userRepository = userRepository;
    }

    /**
     * Compute the full executive health summary for an org over the given week window.
     *
     * @param orgId     the org to analyse
     * @param weekCount how many trailing weeks of data to include
     * @return assembled {@link ExecutiveHealthResponse}
     */
    public ExecutiveHealthResponse computeHealth(UUID orgId, TimeScope scope) {
        // 1. Load org for name — fail fast if not found
        Org org = orgRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));

        // 2. Load config (or use defaults if org has no saved config yet)
        ObservatoryConfig config = configRepository.findByOrgId(orgId)
                .orElseGet(() -> defaultConfig(org));

        // 3. Alignment trend — extract most recent data point for org-level strategic %
        // NOTE (H3): org-wide strategicAlignmentPct is computed across ALL active users in the org,
        // including managers/executives themselves. Per-team numbers (OrgUnitHealth) are computed via
        // findSubtreeUserIds which excludes the root manager, so org-wide will always be slightly
        // higher than the arithmetic sum of team subtotals. This is intentional — the org-wide figure
        // is the authoritative alignment number; the per-team table shows only subordinate coverage.
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, scope);
        double strategicAlignmentPct = mostRecentStrategicPct(alignmentTrend);
        double rallyCoveragePct = mostRecentRallyCoveragePct(alignmentTrend);

        // 4. Completion trend — extract most recent data point for completion + carry-forward rate
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, scope);
        double completionRate = mostRecentCompletionRate(completionTrend);
        double carryForwardRate = mostRecentCarryForwardRate(completionTrend);

        // 5. Drift report — count signals at EMERGING severity or above
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int activeDriftSignals = countActiveDriftSignals(driftReport);

        // 6. Integrity report — null cycleId means the most recent cycle
        IntegrityReport integrityReport = driftDetectionService.detectSignalIntegrity(orgId, null);
        int integrityFlags = integrityReport.flags().size();

        // 7. Per-VP/Director breakdown
        List<OrgUnitHealth> units = buildUnitHealthList(orgId, scope, config);

        // 8. Overall grade from org-wide alignment
        HealthGrade overallGrade = computeGrade(strategicAlignmentPct, config);

        log.debug("computeHealth orgId={} grade={} alignment={}% driftSignals={} integrityFlags={}",
                orgId, overallGrade, strategicAlignmentPct, activeDriftSignals, integrityFlags);

        return new ExecutiveHealthResponse(
                orgId,
                org.getName(),
                overallGrade,
                strategicAlignmentPct,
                rallyCoveragePct,
                completionRate,
                carryForwardRate,
                activeDriftSignals,
                integrityFlags,
                units,
                Instant.now()
        );
    }

    // --------------- grade computation — package-visible, also used by ObservatoryController ---------------

    /**
     * Compute health grade from strategic alignment % using observatory config thresholds.
     *
     * <p>GREEN  — alignment is at or above the strategic target<br>
     * YELLOW — alignment is below target but above the warning threshold<br>
     * RED    — alignment is below the warning threshold
     */
    static HealthGrade computeGrade(double strategicAlignmentPct, ObservatoryConfig config) {
        if (strategicAlignmentPct >= config.getStrategicAlignmentTarget().doubleValue()) {
            return HealthGrade.GREEN;
        } else if (strategicAlignmentPct >= config.getMisalignmentWarningPct().doubleValue()) {
            return HealthGrade.YELLOW;
        } else {
            return HealthGrade.RED;
        }
    }

    // --------------- private helpers ---------------

    private double mostRecentStrategicPct(List<AlignmentDataPoint> trend) {
        if (trend == null || trend.isEmpty()) {
            return 0.0;
        }
        return trend.get(trend.size() - 1).strategicPct();
    }

    private double mostRecentRallyCoveragePct(List<AlignmentDataPoint> trend) {
        if (trend == null || trend.isEmpty()) {
            return 0.0;
        }
        return trend.get(trend.size() - 1).rallyCoveragePct();
    }

    private double mostRecentCompletionRate(List<CompletionDataPoint> trend) {
        if (trend == null || trend.isEmpty()) {
            return 0.0;
        }
        return trend.get(trend.size() - 1).completionRate();
    }

    private double mostRecentCarryForwardRate(List<CompletionDataPoint> trend) {
        if (trend == null || trend.isEmpty()) {
            return 0.0;
        }
        return trend.get(trend.size() - 1).carryForwardRate();
    }

    private int countActiveDriftSignals(DriftReport report) {
        if (report == null || report.signals() == null) {
            return 0;
        }
        // EMERGING, SUSTAINED, and STRUCTURAL are all active signals
        return (int) report.signals().stream()
                .filter(s -> s.severity() != null && isActiveSignal(s.severity()))
                .count();
    }

    private boolean isActiveSignal(DriftSeverity severity) {
        return severity == DriftSeverity.EMERGING
                || severity == DriftSeverity.SUSTAINED
                || severity == DriftSeverity.STRUCTURAL;
    }

    /**
     * Build one {@link OrgUnitHealth} per VP or Director in the org.
     * Per-unit alignment uses the team-scoped alignment trend from AnalyticsService.
     */
    private List<OrgUnitHealth> buildUnitHealthList(UUID orgId, TimeScope scope, ObservatoryConfig config) {
        List<AppUser> leaders = userRepository.findByOrgIdAndRoleIn(
                orgId, List.of(UserRole.VP, UserRole.DIRECTOR));

        if (leaders.isEmpty()) {
            return List.of();
        }

        List<OrgUnitHealth> units = new ArrayList<>(leaders.size());
        for (AppUser leader : leaders) {
            units.add(buildUnitHealth(orgId, leader, scope, config));
        }
        return units;
    }

    private OrgUnitHealth buildUnitHealth(UUID orgId, AppUser leader, TimeScope scope, ObservatoryConfig config) {
        UUID managerId = leader.getId();

        // Team-scoped alignment
        TeamAlignmentTrend teamTrend = analyticsService.computeTeamAlignmentTrend(orgId, managerId, scope);
        List<AlignmentDataPoint> teamAlignment = (teamTrend != null) ? teamTrend.dataPoints() : List.of();
        double unitStrategicPct = mostRecentStrategicPct(teamAlignment);
        double unitRallyCoveragePct = mostRecentRallyCoveragePct(teamAlignment);

        // Team-scoped completion
        List<CompletionDataPoint> teamCompletion = analyticsService.computeTeamCompletionTrend(
                orgId, managerId, scope);
        double unitCompletionRate = mostRecentCompletionRate(teamCompletion);

        // Headcount from full reporting subtree (not just direct reports)
        int headcount = userRepository.findSubtreeUserIds(managerId).size();
        int costBandWeightedHeadcount = computeCostBandWeightedHeadcount(leader);

        String trendDirection = computeTrendDirection(teamAlignment);
        int weeksTrending = computeWeeksTrending(teamAlignment);

        HealthGrade grade = computeGrade(unitStrategicPct, config);

        return new OrgUnitHealth(
                managerId,
                leader.getDisplayName(),
                leader.getRole().name(),
                headcount,
                costBandWeightedHeadcount,
                grade,
                unitStrategicPct,
                unitRallyCoveragePct,
                unitCompletionRate,
                trendDirection,
                weeksTrending
        );
    }

    private int computeCostBandWeightedHeadcount(AppUser leader) {
        // NOTE: Only counts direct reports, not full subtree. Subtree headcount uses findSubtreeUserIds.
        if (leader.getDirectReports() == null) {
            return 0;
        }
        return leader.getDirectReports().stream()
                .mapToInt(report -> report.getCostBand() != null ? report.getCostBand().getTier() : 0)
                .sum();
    }

    /**
     * Determine the trend direction from the alignment data points using {@link TrendAnalyzer}.
     *
     * @return "declining", "improving", or "flat"
     */
    private String computeTrendDirection(List<AlignmentDataPoint> dataPoints) {
        List<Double> values = dataPoints.stream()
                .map(AlignmentDataPoint::strategicPct)
                .toList();
        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);
        return result.direction().name().toLowerCase();
    }

    /**
     * Count consecutive weeks in the current trend direction using {@link TrendAnalyzer}.
     *
     * <p>Returns a signed integer representing the current streak:
     * <ul>
     *   <li>Positive — consecutive improving weeks (e.g. +3 means 3 weeks improving)</li>
     *   <li>Negative — consecutive declining weeks (e.g. -2 means 2 weeks declining)</li>
     *   <li>Zero — no streak / stable</li>
     * </ul>
     */
    private int computeWeeksTrending(List<AlignmentDataPoint> dataPoints) {
        List<Double> values = dataPoints.stream()
                .map(AlignmentDataPoint::strategicPct)
                .toList();
        TrendAnalyzer.TrendResult result = TrendAnalyzer.analyzeDecline(values, 2.0);
        if (result.declineWeeks() > 0) {
            return -result.declineWeeks(); // negative = declining
        }
        int improvingWeeks = TrendAnalyzer.countImprovingWeeks(values, 2.0);
        return improvingWeeks; // positive = improving, 0 = stable
    }

    /**
     * Return a transient default config (not persisted) for orgs that have no saved config yet.
     * Uses the same field defaults as the entity.
     */
    private ObservatoryConfig defaultConfig(Org org) {
        return ObservatoryConfig.builder().org(org).build();
    }
}
