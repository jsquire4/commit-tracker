package com.compass.platform.domain.observatory;

import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftMetric;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSeverity;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import com.compass.platform.domain.observatory.dto.DriftUnitType;
import com.compass.platform.domain.observatory.dto.IntegrityFlag;
import com.compass.platform.domain.observatory.dto.IntegrityFlagType;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.TeamAlignmentTrend;
import com.compass.platform.domain.observatory.dto.TrendDirection;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Detects when organizational units are drifting away from strategic alignment over time.
 * Uses configurable thresholds from {@link ObservatoryConfig}.
 */
@Service
@Transactional(readOnly = true)
public class DriftDetectionService {

    private static final Set<UserRole> MANAGER_ROLES =
            Set.of(UserRole.MANAGER, UserRole.DIRECTOR, UserRole.VP);

    private final ObservatoryConfigRepository configRepository;
    private final AppUserRepository userRepository;
    private final CommitmentRepository commitmentRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final RallyCryRepository rallyCryRepository;
    private final CycleRepository cycleRepository;
    private final OrgRepository orgRepository;
    private final AnalyticsService analyticsService;

    public DriftDetectionService(ObservatoryConfigRepository configRepository,
                                 AppUserRepository userRepository,
                                 CommitmentRepository commitmentRepository,
                                 ReconciliationRecordRepository reconciliationRecordRepository,
                                 RallyCryRepository rallyCryRepository,
                                 CycleRepository cycleRepository,
                                 OrgRepository orgRepository,
                                 AnalyticsService analyticsService) {
        this.configRepository = configRepository;
        this.userRepository = userRepository;
        this.commitmentRepository = commitmentRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.rallyCryRepository = rallyCryRepository;
        this.cycleRepository = cycleRepository;
        this.orgRepository = orgRepository;
        this.analyticsService = analyticsService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Detect drift signals across all manager-level users in the given org.
     * Emits ALIGNMENT drift (strategic % decline), VELOCITY drift (completion rate decline),
     * and COVERAGE drift (rally cry with consecutive zero-commitment cycles).
     *
     * @param orgId organisation to analyse
     * @return DriftReport containing all surfaced signals and a generation timestamp
     */
    @Transactional
    public DriftReport detectDrift(UUID orgId) {
        ObservatoryConfig config = getOrCreateConfig(orgId);
        com.compass.platform.domain.observatory.dto.TimeScope driftScope =
                com.compass.platform.domain.observatory.dto.TimeScope.ofWeeks(config.getDriftStructuralWeeks());

        List<AppUser> managers = userRepository.findByOrgIdAndIsActiveTrue(orgId).stream()
                .filter(u -> MANAGER_ROLES.contains(u.getRole()))
                .collect(Collectors.toList());

        List<DriftSignal> signals = new ArrayList<>();

        // Pre-compute subtree user IDs for all managers to avoid N+1 queries
        Map<UUID, List<UUID>> subtreeMap = new HashMap<>();
        for (AppUser manager : managers) {
            subtreeMap.put(manager.getId(), userRepository.findSubtreeUserIds(manager.getId()));
        }

        for (AppUser manager : managers) {
            List<UUID> teamUserIds = subtreeMap.get(manager.getId());

            // ── ALIGNMENT drift ──────────────────────────────────────────────
            TeamAlignmentTrend alignmentTrend =
                    analyticsService.computeTeamAlignmentTrend(orgId, manager.getId(), driftScope, teamUserIds);

            List<Double> strategicPcts = alignmentTrend.dataPoints().stream()
                    .map(AlignmentDataPoint::strategicPct)
                    .collect(Collectors.toList());

            if (!strategicPcts.isEmpty()) {
                TrendAnalyzer.TrendResult alignResult =
                        TrendAnalyzer.analyzeDecline(strategicPcts, 2.0);

                DriftSeverity alignSeverity = classifySeverity(alignResult.declineWeeks(), config);
                if (alignSeverity != null) {
                    signals.add(new DriftSignal(
                            DriftUnitType.TEAM,
                            manager.getId(),
                            manager.getDisplayName(),
                            DriftMetric.ALIGNMENT,
                            alignSeverity,
                            alignResult.currentValue(),
                            alignResult.baselineValue(),
                            alignResult.declineWeeks(),
                            alignResult.direction(),
                            strategicPcts
                    ));
                }
            }

            // ── VELOCITY drift ───────────────────────────────────────────────
            List<CompletionDataPoint> completionPoints =
                    analyticsService.computeTeamCompletionTrend(orgId, manager.getId(), driftScope, teamUserIds);

            List<Double> completionRates = completionPoints.stream()
                    .map(CompletionDataPoint::completionRate)
                    .collect(Collectors.toList());

            if (!completionRates.isEmpty()) {
                TrendAnalyzer.TrendResult velocityResult =
                        TrendAnalyzer.analyzeDecline(completionRates, 2.0);

                DriftSeverity velocitySeverity =
                        classifySeverity(velocityResult.declineWeeks(), config);
                if (velocitySeverity != null) {
                    signals.add(new DriftSignal(
                            DriftUnitType.TEAM,
                            manager.getId(),
                            manager.getDisplayName(),
                            DriftMetric.VELOCITY,
                            velocitySeverity,
                            velocityResult.currentValue(),
                            velocityResult.baselineValue(),
                            velocityResult.declineWeeks(),
                            velocityResult.direction(),
                            completionRates
                    ));
                }
            }
        }

        // ── COVERAGE drift ───────────────────────────────────────────────────
        signals.addAll(detectCoverageDrift(orgId, config));

        return new DriftReport(signals, Instant.now());
    }

    /**
     * Detect signal integrity anomalies for the given org and cycle.
     * Checks for uniform categorisation, manager/team completion mismatch, and duplicate notes.
     *
     * @param orgId   organisation to inspect
     * @param cycleId the cycle being evaluated
     * @return IntegrityReport containing all detected flags
     */
    public IntegrityReport detectSignalIntegrity(UUID orgId, UUID cycleId) {
        // Resolve null cycleId to most recent RECONCILED cycle
        UUID resolvedCycleId = cycleId;
        if (resolvedCycleId == null) {
            resolvedCycleId = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId).stream()
                    .filter(c -> c.getState() == CycleState.RECONCILED)
                    .findFirst()
                    .map(Cycle::getId)
                    .orElse(null);
        }
        if (resolvedCycleId == null) {
            return new IntegrityReport(List.of());
        }

        ObservatoryConfig config = configRepository.findByOrgId(orgId)
                .orElseGet(() -> {
                    Org org = orgRepository.findById(orgId)
                            .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));
                    return ObservatoryConfig.builder().org(org).build();
                });

        List<AppUser> managers = userRepository.findByOrgIdAndIsActiveTrue(orgId).stream()
                .filter(u -> MANAGER_ROLES.contains(u.getRole()))
                .collect(Collectors.toList());

        List<IntegrityFlag> flags = new ArrayList<>();

        // Pre-compute subtree user IDs for all managers to avoid N+1 queries
        Map<UUID, List<UUID>> subtreeMap = new HashMap<>();
        for (AppUser manager : managers) {
            subtreeMap.put(manager.getId(), userRepository.findSubtreeUserIds(manager.getId()));
        }

        // Batch-load all commitments for the cycle once, then filter per-manager in memory
        Set<UUID> allTeamUserIds = new java.util.HashSet<>();
        for (AppUser manager : managers) {
            allTeamUserIds.addAll(subtreeMap.get(manager.getId()));
            allTeamUserIds.add(manager.getId());
        }
        List<Commitment> allCycleCommitments = allTeamUserIds.isEmpty()
                ? List.of()
                : commitmentRepository.findByUserIdInAndCycleId(new ArrayList<>(allTeamUserIds), resolvedCycleId);
        Map<UUID, List<Commitment>> commitmentsByUserId = allCycleCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getUser().getId()));

        for (AppUser manager : managers) {
            List<UUID> teamUserIds = subtreeMap.get(manager.getId());
            List<UUID> allUserIds = new ArrayList<>(teamUserIds);
            allUserIds.add(manager.getId());

            // Filter from pre-loaded commitments instead of querying per manager
            List<Commitment> teamCommitments = allUserIds.stream()
                    .flatMap(uid -> commitmentsByUserId.getOrDefault(uid, List.of()).stream())
                    .collect(Collectors.toList());

            // ── UNIFORM_CATEGORIZATION ────────────────────────────────────────
            detectUniformCategorization(manager, teamCommitments, config, flags);

            // ── COMPLETION_MISMATCH ───────────────────────────────────────────
            detectStrategicDivergence(manager, teamUserIds, resolvedCycleId, commitmentsByUserId, flags);
        }

        // ── DUPLICATE_NOTES ───────────────────────────────────────────────────
        detectDuplicateNotes(orgId, resolvedCycleId, flags);

        return new IntegrityReport(flags);
    }

    /**
     * Load the org's ObservatoryConfig, creating and persisting a default one if absent.
     * Declared public so it can be called from the controller layer when bootstrapping an org.
     */
    @Transactional
    public ObservatoryConfig getOrCreateConfig(UUID orgId) {
        return configRepository.findByOrgId(orgId).orElseGet(() -> {
            Org org = orgRepository.findById(orgId)
                    .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));
            ObservatoryConfig defaults = ObservatoryConfig.builder().org(org).build();
            return configRepository.save(defaults);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns null when the decline count is below the emerging threshold (not worth surfacing).
     */
    private DriftSeverity classifySeverity(int declineWeeks, ObservatoryConfig config) {
        if (declineWeeks >= config.getDriftStructuralWeeks()) return DriftSeverity.STRUCTURAL;
        if (declineWeeks >= config.getDriftSustainedWeeks())  return DriftSeverity.SUSTAINED;
        if (declineWeeks >= config.getDriftEmergingWeeks())   return DriftSeverity.EMERGING;
        return null; // below threshold — do not surface
    }

    /**
     * Detect COVERAGE drift: rally cries that have had zero commitments linked to them
     * for enough consecutive recent cycles to exceed the emerging threshold.
     */
    private List<DriftSignal> detectCoverageDrift(UUID orgId, ObservatoryConfig config) {
        List<DriftSignal> signals = new ArrayList<>();

        List<RallyCry> rallyCries =
                rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId);

        // Load recent RECONCILED cycles ordered newest-first; we need at most driftStructuralWeeks cycles.
        List<Cycle> allCycles = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId).stream()
                .filter(c -> c.getState() == CycleState.RECONCILED)
                .toList();
        int maxLookback = config.getDriftStructuralWeeks();
        List<Cycle> lookbackCycles = allCycles.size() > maxLookback
                ? allCycles.subList(0, maxLookback)
                : allCycles;

        // Pre-load commitments for each lookback cycle in one query per cycle (not per rally cry × cycle).
        // Key: cycleId → (rallyCryId → commitment count)
        Map<UUID, Map<UUID, Long>> commitmentCountByCycleAndRallyCry = new HashMap<>();
        for (Cycle cycle : lookbackCycles) {
            List<Commitment> cycleCommitments =
                    commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycle.getId());
            Map<UUID, Long> countByRallyCry = cycleCommitments.stream()
                    .filter(c -> c.getRallyCry() != null)
                    .collect(Collectors.groupingBy(
                            c -> c.getRallyCry().getId(),
                            Collectors.counting()));
            commitmentCountByCycleAndRallyCry.put(cycle.getId(), countByRallyCry);
        }

        for (RallyCry rc : rallyCries) {
            // Walk from the most recent cycle backward, counting consecutive zero-commitment cycles.
            int consecutiveZero = 0;
            // Track the last non-zero value seen during the backward walk — this is the baseline
            // (the commitment count just before the zero-streak started). 0.0 if all were zero.
            double lastNonZeroValue = 0.0;
            // We build dataPoints in chronological order (oldest first) for sparkline rendering.
            // NOTE: The sparkline data is intentionally truncated at the first non-zero cycle
            // (i.e., only the zero-streak window is shown), making the absence of coverage visible.
            List<Double> dataPoints = new ArrayList<>();

            for (Cycle cycle : lookbackCycles) {
                long count = commitmentCountByCycleAndRallyCry
                        .getOrDefault(cycle.getId(), Map.of())
                        .getOrDefault(rc.getId(), 0L);
                // Insert at front to maintain chronological order (lookbackCycles is newest-first)
                dataPoints.add(0, (double) count);
                if (count == 0) {
                    consecutiveZero++;
                } else {
                    // Streak broken — the value just before the streak is the baseline
                    lastNonZeroValue = (double) count;
                    break;
                }
            }

            DriftSeverity severity = classifySeverity(consecutiveZero, config);
            if (severity != null) {
                signals.add(new DriftSignal(
                        DriftUnitType.ORG_UNIT,
                        rc.getId(),
                        rc.getTitle(),
                        DriftMetric.COVERAGE,
                        severity,
                        0.0,  // currentValue is 0 — that is the definition of the coverage absence
                        lastNonZeroValue, // baseline: last non-zero value before the streak, or 0.0 if all zero
                        consecutiveZero,
                        TrendDirection.DECLINING,
                        dataPoints
                ));
            }
        }

        return signals;
    }

    /**
     * Flag a manager's team if more than {@code config.uniformityThreshold}% of commitments
     * share a single CHESS category.
     */
    private void detectUniformCategorization(AppUser manager, List<Commitment> teamCommitments,
                                              ObservatoryConfig config, List<IntegrityFlag> flags) {
        if (teamCommitments.isEmpty()) return;

        Map<String, Long> byCat = teamCommitments.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getChessCategory() != null
                                ? CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())
                                : "__NONE__",
                        Collectors.counting()
                ));

        long total = teamCommitments.size();
        double threshold = config.getUniformityThreshold().doubleValue();

        for (Map.Entry<String, Long> entry : byCat.entrySet()) {
            double pct = (entry.getValue() * 100.0) / total;
            if (pct > threshold) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("managerId", manager.getId().toString());
                details.put("managerName", manager.getDisplayName());
                details.put("dominantCategory", entry.getKey());
                details.put("percentage", Math.round(pct * 100.0) / 100.0);
                details.put("totalCommitments", total);

                flags.add(new IntegrityFlag(
                        IntegrityFlagType.UNIFORM_CATEGORIZATION,
                        manager.getId(),
                        details
                ));
                break; // only one UNIFORM_CATEGORIZATION flag per manager
            }
        }
    }

    /**
     * Flag a manager when their own strategic% diverges from their team's strategic% by
     * more than 20 percentage points.
     *
     * <p>Note: this method is named {@code detectStrategicDivergence} to accurately describe
     * what it measures (strategic-% divergence between manager and team). The associated
     * {@link IntegrityFlagType#COMPLETION_MISMATCH} enum value is kept unchanged for
     * frontend compatibility.
     */
    private void detectStrategicDivergence(AppUser manager, List<UUID> teamUserIds,
                                          UUID cycleId, Map<UUID, List<Commitment>> commitmentsByUserId,
                                          List<IntegrityFlag> flags) {
        List<Commitment> managerCommitments =
                commitmentsByUserId.getOrDefault(manager.getId(), List.of());

        if (managerCommitments.isEmpty() || teamUserIds.isEmpty()) return;

        List<Commitment> reportCommitments = teamUserIds.stream()
                .flatMap(uid -> commitmentsByUserId.getOrDefault(uid, List.of()).stream())
                .collect(Collectors.toList());

        if (reportCommitments.isEmpty()) return;

        double managerStrategicPct = computeStrategicPct(managerCommitments);
        double teamStrategicPct    = computeStrategicPct(reportCommitments);

        double divergence = Math.abs(managerStrategicPct - teamStrategicPct);
        if (divergence > 20.0) {
            Map<String, Object> details = new LinkedHashMap<>();
            details.put("managerId", manager.getId().toString());
            details.put("managerName", manager.getDisplayName());
            details.put("managerStrategicPct", Math.round(managerStrategicPct * 100.0) / 100.0);
            details.put("teamStrategicPct", Math.round(teamStrategicPct * 100.0) / 100.0);
            details.put("divergencePoints", Math.round(divergence * 100.0) / 100.0);

            flags.add(new IntegrityFlag(
                    IntegrityFlagType.COMPLETION_MISMATCH,
                    manager.getId(),
                    details
            ));
        }
    }

    /**
     * Detect reconciliation notes that are copy-pasted across multiple commitments by the
     * same user in a single cycle. Algorithm: exact string match after lowercasing and
     * trimming whitespace.
     */
    private void detectDuplicateNotes(UUID orgId, UUID cycleId, List<IntegrityFlag> flags) {
        List<ReconciliationRecord> records =
                reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId);

        Map<UUID, List<ReconciliationRecord>> byUser = records.stream()
                .filter(r -> r.getNotes() != null && !r.getNotes().isBlank())
                .collect(Collectors.groupingBy(r -> r.getReconciledBy().getId()));

        for (Map.Entry<UUID, List<ReconciliationRecord>> userEntry : byUser.entrySet()) {
            UUID userId = userEntry.getKey();
            List<ReconciliationRecord> userRecords = userEntry.getValue();

            Map<String, Long> noteCounts = userRecords.stream()
                    .collect(Collectors.groupingBy(
                            r -> r.getNotes().toLowerCase().trim(),
                            Collectors.counting()
                    ));

            List<String> duplicates = noteCounts.entrySet().stream()
                    .filter(e -> e.getValue() >= 2)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            if (!duplicates.isEmpty()) {
                String userName = userRecords.get(0).getReconciledBy().getDisplayName();

                Map<String, Object> details = new LinkedHashMap<>();
                details.put("userId", userId.toString());
                details.put("userName", userName);
                details.put("duplicateNotes", duplicates);
                details.put("occurrences", duplicates.stream()
                        .map(noteCounts::get)
                        .collect(Collectors.toList()));

                flags.add(new IntegrityFlag(
                        IntegrityFlagType.DUPLICATE_NOTES,
                        userId,
                        details
                ));
            }
        }
    }

    /**
     * Compute the percentage of commitments whose chess category normalizes to "Strategic".
     * Uses {@link CategoryUtils#normalizeCategoryName} for consistent case handling.
     * Commitments with no category contribute to the denominator.
     */
    private double computeStrategicPct(List<Commitment> commitments) {
        if (commitments.isEmpty()) return 0.0;
        long strategic = commitments.stream()
                .filter(c -> c.getChessCategory() != null
                        && "Strategic".equals(CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())))
                .count();
        return (double) strategic / commitments.size() * 100.0;
    }
}
