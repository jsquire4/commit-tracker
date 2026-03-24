package com.compass.platform.domain.observatory;

import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CarryForwardChain;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.CostWeightedSignal;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import com.compass.platform.domain.observatory.dto.IntegrityFlag;
import com.compass.platform.domain.observatory.dto.IntegrityFlagType;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.ManagerHeatmapRow;
import com.compass.platform.domain.observatory.dto.ObservatorySignal;
import com.compass.platform.domain.observatory.dto.PersonHeatmapRow;
import com.compass.platform.domain.observatory.dto.ProgramHeatmapResponse;
import com.compass.platform.domain.observatory.dto.SignalMetric;
import com.compass.platform.domain.observatory.dto.SignalsSummaryResponse;
import com.compass.platform.domain.observatory.dto.TeamAlignmentTrend;
import com.compass.platform.domain.observatory.dto.WeekCell;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Analytical engine powering the Executive Observatory view.
 * Computes cross-cycle metrics for alignment trends, completion trends,
 * carry-forward chains, and cost-weighted misalignment.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final CommitmentRepository commitmentRepository;
    private final CycleRepository cycleRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final AppUserRepository userRepository;

    public AnalyticsService(CommitmentRepository commitmentRepository,
                            CycleRepository cycleRepository,
                            ReconciliationRecordRepository reconciliationRecordRepository,
                            AppUserRepository userRepository) {
        this.commitmentRepository = commitmentRepository;
        this.cycleRepository = cycleRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.userRepository = userRepository;
    }

    /**
     * Compute the strategic alignment percentage per cycle for the last N cycles.
     * Returns data ordered chronologically (oldest first) for chart rendering.
     *
     * @param orgId     organization ID
     * @param weekCount number of most-recent cycles to include
     * @return list of {@link AlignmentDataPoint} ordered by startsAt ascending
     */
    public List<AlignmentDataPoint> computeAlignmentTrend(UUID orgId, int weekCount) {
        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();
        List<Commitment> allCommitments = commitmentRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);
        Map<UUID, List<Commitment>> commitmentsByCycle = allCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getCycle().getId()));

        List<AlignmentDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = commitmentsByCycle.getOrDefault(cycle.getId(), List.of());
            results.add(buildAlignmentDataPoint(cycle, commitments));
        }

        // Return chronological order (oldest → newest)
        results.sort(Comparator.comparing(AlignmentDataPoint::startsAt));
        log.debug("computeAlignmentTrend orgId={} weekCount={} cyclesFound={}", orgId, weekCount, results.size());
        return results;
    }

    /**
     * Compute completion and carry-forward rates per cycle for the last N cycles.
     * Returns data ordered chronologically (oldest first).
     *
     * @param orgId     organization ID
     * @param weekCount number of most-recent cycles to include
     * @return list of {@link CompletionDataPoint} ordered by startsAt ascending
     */
    public List<CompletionDataPoint> computeCompletionTrend(UUID orgId, int weekCount) {
        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();

        // Bulk-load all reconciliation records for the range at once
        List<ReconciliationRecord> allRecords =
                reconciliationRecordRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);
        Map<UUID, List<ReconciliationRecord>> recordsByCycle = allRecords.stream()
                .collect(Collectors.groupingBy(r -> r.getCycle().getId()));

        // Bulk-load all commitments for the cycle range in one query
        List<Commitment> allCommitments = commitmentRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);
        Map<UUID, List<Commitment>> commitmentsByCycle = allCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getCycle().getId()));

        List<CompletionDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = commitmentsByCycle.getOrDefault(cycle.getId(), List.of());
            List<ReconciliationRecord> records =
                    recordsByCycle.getOrDefault(cycle.getId(), List.of());
            results.add(buildCompletionDataPoint(cycle, commitments, records));
        }

        results.sort(Comparator.comparing(CompletionDataPoint::startsAt));
        log.debug("computeCompletionTrend orgId={} weekCount={} cyclesFound={}", orgId, weekCount, results.size());
        return results;
    }

    /**
     * Compute alignment trend scoped to a manager's team (via subtree user IDs).
     *
     * @param orgId     organization ID
     * @param managerId manager whose subtree defines the team
     * @param weekCount number of most-recent cycles to include
     * @return {@link TeamAlignmentTrend} containing per-cycle alignment data for the team
     */
    public TeamAlignmentTrend computeTeamAlignmentTrend(UUID orgId, UUID managerId, int weekCount) {
        List<UUID> teamUserIds = userRepository.findSubtreeUserIds(managerId);
        return computeTeamAlignmentTrend(orgId, managerId, weekCount, teamUserIds);
    }

    /**
     * Compute alignment trend scoped to a manager's team using pre-computed subtree user IDs.
     * Avoids the N+1 query pattern when called in a loop over managers.
     *
     * @param orgId       organization ID
     * @param managerId   manager whose subtree defines the team
     * @param weekCount   number of most-recent cycles to include
     * @param teamUserIds pre-computed subtree user IDs for the manager
     * @return {@link TeamAlignmentTrend} containing per-cycle alignment data for the team
     */
    public TeamAlignmentTrend computeTeamAlignmentTrend(UUID orgId, UUID managerId, int weekCount,
                                                         List<UUID> teamUserIds) {
        AppUser manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));

        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();

        // Bulk-load all team commitments for the cycle range in one query, then group by cycleId
        Map<UUID, List<Commitment>> teamCommitmentsByCycle;
        if (teamUserIds.isEmpty()) {
            teamCommitmentsByCycle = Map.of();
        } else {
            List<Commitment> allTeamCommitments =
                    commitmentRepository.findByUserIdInAndCycleIdIn(teamUserIds, cycleIds);
            teamCommitmentsByCycle = allTeamCommitments.stream()
                    .collect(Collectors.groupingBy(c -> c.getCycle().getId()));
        }

        List<AlignmentDataPoint> dataPoints = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = teamCommitmentsByCycle.getOrDefault(cycle.getId(), List.of());
            dataPoints.add(buildAlignmentDataPoint(cycle, commitments));
        }

        dataPoints.sort(Comparator.comparing(AlignmentDataPoint::startsAt));

        log.debug("computeTeamAlignmentTrend orgId={} managerId={} teamSize={} cyclesFound={}",
                orgId, managerId, teamUserIds.size(), dataPoints.size());

        return new TeamAlignmentTrend(
                manager.getId(),
                manager.getDisplayName(),
                manager.getRole().name(),
                teamUserIds.size(),
                dataPoints
        );
    }

    /**
     * Compute per-manager per-cycle CHESS category heatmap data for the last N reconciled cycles.
     * Returns one row per MANAGER-role user, with team-averaged week cells and per-person breakdown.
     *
     * @param orgId     organization ID
     * @param weekCount number of most-recent reconciled cycles to include
     * @return {@link ProgramHeatmapResponse} with a row per manager
     */
    public ProgramHeatmapResponse computeProgramHeatmap(UUID orgId, int weekCount) {
        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();

        // Bulk-load all commitments for the cycle range in one query
        List<Commitment> allOrgCommitments = commitmentRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);
        Map<UUID, List<Commitment>> commitmentsByCycle = allOrgCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getCycle().getId()));

        // Index commitments by (cycleId, userId) for fast per-person lookup
        Map<UUID, Map<UUID, List<Commitment>>> byUserByCycle = new HashMap<>();
        for (Map.Entry<UUID, List<Commitment>> entry : commitmentsByCycle.entrySet()) {
            UUID cycleId = entry.getKey();
            Map<UUID, List<Commitment>> byUser = entry.getValue().stream()
                    .collect(Collectors.groupingBy(c -> c.getUser().getId()));
            byUserByCycle.put(cycleId, byUser);
        }

        // Resolve all MANAGER-role users in the org
        List<AppUser> managers = userRepository.findByOrgIdAndRoleIn(orgId, List.of(UserRole.MANAGER));

        // Pre-compute subtree user IDs for all managers to avoid N+1 queries
        Map<UUID, List<UUID>> subtreeMap = new HashMap<>();
        for (AppUser manager : managers) {
            subtreeMap.put(manager.getId(), userRepository.findSubtreeUserIds(manager.getId()));
        }

        List<ManagerHeatmapRow> managerRows = new ArrayList<>();
        for (AppUser manager : managers) {
            List<UUID> teamUserIds = subtreeMap.get(manager.getId());

            // Build per-person rows
            // Collect unique AppUser instances for all team members encountered across cycles
            Map<UUID, AppUser> teamUsersById = new HashMap<>();
            for (UUID cycleId : cycleIds) {
                Map<UUID, List<Commitment>> byUser = byUserByCycle.getOrDefault(cycleId, Map.of());
                for (UUID userId : teamUserIds) {
                    if (!teamUsersById.containsKey(userId)) {
                        List<Commitment> userCmts = byUser.get(userId);
                        if (userCmts != null && !userCmts.isEmpty()) {
                            teamUsersById.put(userId, userCmts.get(0).getUser());
                        }
                    }
                }
            }

            List<PersonHeatmapRow> personRows = new ArrayList<>();
            for (UUID memberId : teamUserIds) {
                AppUser member = teamUsersById.get(memberId);
                if (member == null) continue; // no commitments in range — skip

                List<WeekCell> personCells = new ArrayList<>();
                for (Cycle cycle : cycles) {
                    Map<UUID, List<Commitment>> byUser =
                            byUserByCycle.getOrDefault(cycle.getId(), Map.of());
                    List<Commitment> userCmts = byUser.getOrDefault(memberId, List.of());
                    personCells.add(buildWeekCell(cycle, userCmts));
                }
                personRows.add(new PersonHeatmapRow(member.getId(), member.getDisplayName(), personCells));
            }

            // Build team-averaged week cells
            List<WeekCell> teamCells = new ArrayList<>();
            for (Cycle cycle : cycles) {
                Map<UUID, List<Commitment>> byUser =
                        byUserByCycle.getOrDefault(cycle.getId(), Map.of());
                List<Commitment> teamCmts = teamUserIds.stream()
                        .flatMap(uid -> byUser.getOrDefault(uid, List.of()).stream())
                        .toList();
                teamCells.add(buildWeekCell(cycle, teamCmts));
            }

            managerRows.add(new ManagerHeatmapRow(
                    manager.getId(),
                    manager.getDisplayName(),
                    manager.getRole().name(),
                    teamUserIds.size(),
                    teamCells,
                    personRows
            ));
        }

        log.debug("computeProgramHeatmap orgId={} weekCount={} managersFound={}", orgId, weekCount, managerRows.size());
        return new ProgramHeatmapResponse(managerRows);
    }

    /**
     * Compute completion trend scoped to a manager's team for the last N cycles.
     * Used by DriftDetectionService for VELOCITY drift detection per manager.
     *
     * @param orgId     organization ID
     * @param managerId manager whose subtree defines the team
     * @param weekCount number of most-recent cycles to include
     * @return list of {@link CompletionDataPoint} ordered by startsAt ascending
     */
    public List<CompletionDataPoint> computeTeamCompletionTrend(UUID orgId, UUID managerId, int weekCount) {
        List<UUID> teamUserIds = userRepository.findSubtreeUserIds(managerId);
        return computeTeamCompletionTrend(orgId, managerId, weekCount, teamUserIds);
    }

    /**
     * Compute completion trend scoped to a manager's team using pre-computed subtree user IDs.
     * Avoids the N+1 query pattern when called in a loop over managers.
     *
     * @param orgId       organization ID
     * @param managerId   manager whose subtree defines the team
     * @param weekCount   number of most-recent cycles to include
     * @param teamUserIds pre-computed subtree user IDs for the manager
     * @return list of {@link CompletionDataPoint} ordered by startsAt ascending
     */
    public List<CompletionDataPoint> computeTeamCompletionTrend(UUID orgId, UUID managerId, int weekCount,
                                                                 List<UUID> teamUserIds) {
        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();

        // Bulk-load all org reconciliation records for this range, then filter to team
        List<ReconciliationRecord> allRecords =
                reconciliationRecordRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);

        // Bulk-load all team commitments for the cycle range in one query, then group by cycleId
        Map<UUID, List<Commitment>> teamCommitmentsByCycle;
        Set<UUID> teamCommitmentIds;
        if (teamUserIds.isEmpty()) {
            teamCommitmentsByCycle = Map.of();
            teamCommitmentIds = Set.of();
        } else {
            List<Commitment> allTeamCommitments =
                    commitmentRepository.findByUserIdInAndCycleIdIn(teamUserIds, cycleIds);
            teamCommitmentsByCycle = allTeamCommitments.stream()
                    .collect(Collectors.groupingBy(c -> c.getCycle().getId()));
            teamCommitmentIds = allTeamCommitments.stream()
                    .map(Commitment::getId)
                    .collect(Collectors.toSet());
        }

        Map<UUID, List<ReconciliationRecord>> recordsByCycle = allRecords.stream()
                .filter(r -> teamCommitmentIds.contains(r.getCommitment().getId()))
                .collect(Collectors.groupingBy(r -> r.getCycle().getId()));

        List<CompletionDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = teamCommitmentsByCycle.getOrDefault(cycle.getId(), List.of());
            List<ReconciliationRecord> records =
                    recordsByCycle.getOrDefault(cycle.getId(), List.of());
            results.add(buildCompletionDataPoint(cycle, commitments, records));
        }

        results.sort(Comparator.comparing(CompletionDataPoint::startsAt));
        log.debug("computeTeamCompletionTrend orgId={} managerId={} teamSize={} cyclesFound={}",
                orgId, managerId, teamUserIds.size(), results.size());
        return results;
    }

    /**
     * Trace carry-forward chains for all commitments in the given cycle.
     * Walks backward via {@code Commitment.carriedFrom} until the original commitment
     * (where carriedFrom is null). Chain length is the number of carry-forward steps.
     *
     * @param orgId   organization ID (used to scope the seed commitments)
     * @param cycleId target cycle whose commitments are the starting points
     * @return list of {@link CarryForwardChain}, one per commitment that has been carried forward
     */
    public List<CarryForwardChain> computeCarryForwardChains(UUID orgId, UUID cycleId) {
        List<Commitment> commitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);

        // Build a map of all commitments by ID for O(1) parent lookups
        // We need to resolve parents that may be in other cycles — fetch lazily from DB
        List<CarryForwardChain> chains = new ArrayList<>();

        for (Commitment c : commitments) {
            if (c.getCarriedFrom() == null) {
                continue; // Not carried forward — skip
            }

            int chainLength = 0;
            Commitment current = c.getCarriedFrom();
            String originCycleLabel = null;

            while (current != null) {
                chainLength++;
                Commitment parent = current.getCarriedFrom();
                if (parent == null) {
                    // current is the original commitment — record its cycle label
                    originCycleLabel = current.getCycle().getLabel();
                }
                current = parent;
            }

            chains.add(new CarryForwardChain(
                    c.getId(),
                    c.getTitle(),
                    c.getUser().getId(),
                    c.getUser().getDisplayName(),
                    chainLength,
                    originCycleLabel != null ? originCycleLabel : "Unknown"
            ));
        }

        log.debug("computeCarryForwardChains orgId={} cycleId={} chainsFound={}", orgId, cycleId, chains.size());
        return chains;
    }

    /**
     * Compute cost-weighted misalignment for every user in the org for the given cycle.
     * Non-strategic hours are multiplied by the user's hourly rate (or tier as a multiplier
     * when no dollar rate is configured). Results are sorted descending by misalignment cost
     * (worst offenders first).
     *
     * @param orgId   organization ID
     * @param cycleId target cycle
     * @return list of {@link CostWeightedSignal} sorted by misalignmentCost descending
     */
    public List<CostWeightedSignal> computeCostWeightedMisalignment(UUID orgId, UUID cycleId) {
        List<Commitment> commitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);

        // Group commitments by user
        Map<UUID, List<Commitment>> byUser = commitments.stream()
                .collect(Collectors.groupingBy(c -> c.getUser().getId()));

        // Collect unique users from commitment list to avoid an extra DB query
        Map<UUID, AppUser> usersById = commitments.stream()
                .collect(Collectors.toMap(
                        c -> c.getUser().getId(),
                        Commitment::getUser,
                        (a, b) -> a
                ));

        List<CostWeightedSignal> signals = new ArrayList<>();

        for (Map.Entry<UUID, List<Commitment>> entry : byUser.entrySet()) {
            UUID userId = entry.getKey();
            List<Commitment> userCommitments = entry.getValue();
            AppUser user = usersById.get(userId);

            BigDecimal strategicHours = BigDecimal.ZERO;
            BigDecimal nonStrategicHours = BigDecimal.ZERO;

            for (Commitment c : userCommitments) {
                BigDecimal hours = CategoryUtils.resolveEffortHours(c);
                String category = c.getChessCategory() != null
                        ? CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())
                        : "Uncategorized";

                if ("Strategic".equals(category)) {
                    strategicHours = strategicHours.add(hours);
                } else {
                    nonStrategicHours = nonStrategicHours.add(hours);
                }
            }

            BigDecimal totalHours = strategicHours.add(nonStrategicHours);

            // Determine cost multiplier: hourly_rate if set, else tier as integer multiplier
            BigDecimal misalignmentCost;
            String costBandName = "Unassigned";
            int costBandTier = 0;

            if (user.getCostBand() != null) {
                CostBand band = user.getCostBand();
                costBandName = band.getName();
                costBandTier = band.getTier();

                BigDecimal rate = band.getHourlyRate() != null
                        ? band.getHourlyRate()
                        : new BigDecimal(band.getTier());
                misalignmentCost = nonStrategicHours.multiply(rate);
            } else {
                misalignmentCost = BigDecimal.ZERO;
            }

            signals.add(new CostWeightedSignal(
                    user.getId(),
                    user.getDisplayName(),
                    user.getRole().name(),
                    costBandName,
                    costBandTier,
                    totalHours,
                    strategicHours,
                    nonStrategicHours,
                    misalignmentCost
            ));
        }

        // Sort descending: worst offenders first
        signals.sort(Comparator.comparing(CostWeightedSignal::misalignmentCost).reversed());
        log.debug("computeCostWeightedMisalignment orgId={} cycleId={} usersAnalyzed={}", orgId, cycleId, signals.size());
        return signals;
    }

    /**
     * Compose a signals summary from pre-computed drift and integrity reports, plus live
     * displacement and work-distribution data.
     *
     * <p>Signal types produced:
     * <ul>
     *   <li>DRIFT_PATTERN — one signal per DriftSignal in the drift report</li>
     *   <li>DISPLACEMENT_CASCADE — one signal per org-level displacement total > 5</li>
     *   <li>SPECIFICITY_PATTERN — one signal per UNIFORM_CATEGORIZATION integrity flag</li>
     *   <li>WORK_DISTRIBUTION — one signal per manager where one assignee receives >50% of assignments</li>
     * </ul>
     *
     * @param orgId           organisation to analyse
     * @param weekCount       trailing-cycle window for displacement and work-distribution data
     * @param driftReport     pre-computed drift report (call DriftDetectionService first)
     * @param integrityReport pre-computed integrity report (call DriftDetectionService first)
     * @param displacementSummary pre-computed displacement summary (call DisplacementService first)
     * @return SignalsSummaryResponse containing all surfaced signals and a generation timestamp
     */
    public SignalsSummaryResponse computeSignalsSummary(UUID orgId, int weekCount,
                                                         DriftReport driftReport,
                                                         IntegrityReport integrityReport,
                                                         com.compass.platform.domain.observatory.dto.DisplacementSummary displacementSummary) {
        List<ObservatorySignal> signals = new ArrayList<>();

        // ── DRIFT_PATTERN signals ─────────────────────────────────────────────
        for (DriftSignal ds : driftReport.signals()) {
            String title = String.format("%s drift: %s (%s)",
                    ds.metric().name().toLowerCase().replace("_", " "),
                    ds.unitName(),
                    ds.severity().name().toLowerCase());
            String body = String.format(
                    "%s has been in %s-severity %s drift for %d consecutive weeks. " +
                    "Current value: %.1f%%, baseline: %.1f%%.",
                    ds.unitName(),
                    ds.severity().name().toLowerCase(),
                    ds.metric().name().toLowerCase().replace("_", " "),
                    ds.weekCount(),
                    ds.currentValue(),
                    ds.baselineValue());
            List<SignalMetric> metrics = List.of(
                    new SignalMetric("Weeks declining", String.valueOf(ds.weekCount())),
                    new SignalMetric("Current value", String.format("%.1f%%", ds.currentValue())),
                    new SignalMetric("Baseline", String.format("%.1f%%", ds.baselineValue()))
            );
            signals.add(new ObservatorySignal(
                    "DRIFT_PATTERN",
                    "active",
                    null,
                    null,
                    title,
                    body,
                    metrics
            ));
        }

        // ── DISPLACEMENT_CASCADE signals ──────────────────────────────────────
        if (displacementSummary.totalDisplacements() > 5) {
            String topCategory = displacementSummary.byCategory().isEmpty()
                    ? "unspecified"
                    : displacementSummary.byCategory().get(0).category().name().toLowerCase().replace("_", " ");
            String title = String.format("Displacement cascade: %d events over %d weeks",
                    displacementSummary.totalDisplacements(), weekCount);
            String body = String.format(
                    "%d displaced commitments recorded in the last %d cycles. " +
                    "Top displacement category: %s.",
                    displacementSummary.totalDisplacements(), weekCount, topCategory);
            List<SignalMetric> metrics = List.of(
                    new SignalMetric("Total displacements", String.valueOf(displacementSummary.totalDisplacements())),
                    new SignalMetric("Top category", topCategory),
                    new SignalMetric("Categories affected",
                            String.valueOf(displacementSummary.byCategory().size()))
            );
            signals.add(new ObservatorySignal(
                    "DISPLACEMENT_CASCADE",
                    "active",
                    null,
                    null,
                    title,
                    body,
                    metrics
            ));
        }

        // ── SPECIFICITY_PATTERN signals ───────────────────────────────────────
        for (IntegrityFlag flag : integrityReport.flags()) {
            if (flag.type() != IntegrityFlagType.UNIFORM_CATEGORIZATION) continue;
            Map<String, Object> d = flag.details();
            String managerName = String.valueOf(d.getOrDefault("managerName", "Unknown"));
            String dominantCat = String.valueOf(d.getOrDefault("dominantCategory", "unknown"));
            Object pctObj = d.get("percentage");
            String pctStr = pctObj != null ? pctObj + "%" : "unknown";
            Object totalObj = d.get("totalCommitments");
            String totalStr = totalObj != null ? String.valueOf(totalObj) : "unknown";

            String title = String.format("Specificity pattern: %s's team over-indexed on %s",
                    managerName, dominantCat);
            String body = String.format(
                    "%s's team has %s of commitments categorised as %s, " +
                    "suggesting low-specificity or gaming of the CHESS taxonomy.",
                    managerName, pctStr, dominantCat);
            List<SignalMetric> metrics = List.of(
                    new SignalMetric("Dominant category", dominantCat),
                    new SignalMetric("Category share", pctStr),
                    new SignalMetric("Total commitments", totalStr)
            );
            signals.add(new ObservatorySignal(
                    "SPECIFICITY_PATTERN",
                    "active",
                    null,
                    null,
                    title,
                    body,
                    metrics
            ));
        }

        // ── WORK_DISTRIBUTION signals ─────────────────────────────────────────
        // Look at recent cycles: for each manager-assigned commitment, find managers
        // where >50% of their assignments go to a single person.
        List<Cycle> recentCycles = latestCycles(orgId, weekCount);
        List<UUID> recentCycleIds = recentCycles.stream().map(Cycle::getId).toList();

        // Load managers (MANAGER, DIRECTOR, VP roles)
        Set<UserRole> managerRoles = Set.of(UserRole.MANAGER, UserRole.DIRECTOR, UserRole.VP);
        List<AppUser> managers = userRepository.findByOrgIdAndIsActiveTrue(orgId).stream()
                .filter(u -> managerRoles.contains(u.getRole()))
                .toList();

        for (AppUser manager : managers) {
            // Collect all commitments assigned by this manager across recent cycles
            List<Commitment> assigned = recentCycleIds.stream()
                    .flatMap(cycleId -> commitmentRepository
                            .findByAssignedByIdAndCycleId(manager.getId(), cycleId).stream())
                    .toList();

            if (assigned.size() < 3) continue; // not enough data

            // Group by assignee
            Map<UUID, Long> countByAssignee = assigned.stream()
                    .collect(Collectors.groupingBy(c -> c.getUser().getId(), Collectors.counting()));

            long total = assigned.size();
            for (Map.Entry<UUID, Long> entry : countByAssignee.entrySet()) {
                double pct = (double) entry.getValue() / total * 100.0;
                if (pct > 50.0) {
                    // Find the assignee's name from the commitment list
                    String assigneeName = assigned.stream()
                            .filter(c -> c.getUser().getId().equals(entry.getKey()))
                            .findFirst()
                            .map(c -> c.getUser().getDisplayName())
                            .orElse("unknown");

                    String title = String.format("Work distribution risk: %s routes %.0f%% of assignments to %s",
                            manager.getDisplayName(), pct, assigneeName);
                    String body = String.format(
                            "%s has assigned %d of %d commitments (%s) to %s over the last %d cycles, " +
                            "indicating potential concentration risk.",
                            manager.getDisplayName(), entry.getValue(), total,
                            String.format("%.0f%%", pct), assigneeName, weekCount);
                    List<SignalMetric> metrics = List.of(
                            new SignalMetric("Concentration", String.format("%.0f%%", pct)),
                            new SignalMetric("Assignments to " + assigneeName,
                                    entry.getValue() + " of " + total),
                            new SignalMetric("Cycles analysed", String.valueOf(recentCycles.size()))
                    );
                    signals.add(new ObservatorySignal(
                            "WORK_DISTRIBUTION",
                            "active",
                            null,
                            null,
                            title,
                            body,
                            metrics
                    ));
                    break; // one signal per manager
                }
            }
        }

        log.debug("computeSignalsSummary orgId={} weekCount={} signalsGenerated={}", orgId, weekCount, signals.size());
        return new SignalsSummaryResponse(signals, Instant.now());
    }

    // ===== Internal helpers =====

    /**
     * Returns the most-recent {@code limit} RECONCILED cycles for the org,
     * fetched in descending order. Only reconciled cycles have meaningful data
     * for analytics — DRAFT and in-progress cycles are excluded.
     */
    /**
     * Compute alignment data for a single specific cycle.
     *
     * @param orgId   organization ID
     * @param cycleId the exact cycle to load
     * @return {@link AlignmentDataPoint} for the cycle, or {@code null} if the cycle is not found
     */
    public AlignmentDataPoint computeAlignmentForCycle(UUID orgId, UUID cycleId) {
        return cycleRepository.findById(cycleId)
                .filter(c -> c.getOrg().getId().equals(orgId))
                .map(cycle -> {
                    List<Commitment> commitments =
                            commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);
                    return buildAlignmentDataPoint(cycle, commitments);
                })
                .orElse(null);
    }

    /**
     * Compute completion data for a single specific cycle.
     *
     * @param orgId   organization ID
     * @param cycleId the exact cycle to load
     * @return {@link CompletionDataPoint} for the cycle, or {@code null} if the cycle is not found
     */
    public CompletionDataPoint computeCompletionForCycle(UUID orgId, UUID cycleId) {
        return cycleRepository.findById(cycleId)
                .filter(c -> c.getOrg().getId().equals(orgId))
                .map(cycle -> {
                    List<Commitment> commitments =
                            commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);
                    List<ReconciliationRecord> records =
                            reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId);
                    return buildCompletionDataPoint(cycle, commitments, records);
                })
                .orElse(null);
    }

    private List<Cycle> latestCycles(UUID orgId, int limit) {
        List<Cycle> all = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);
        List<Cycle> reconciled = all.stream()
                .filter(c -> c.getState() == CycleState.RECONCILED)
                .toList();
        return reconciled.size() <= limit ? reconciled : reconciled.subList(0, limit);
    }

    /**
     * Builds a {@link WeekCell} from a cycle and a list of commitments (for one person or a team).
     * Computes CHESS category percentages and derives the dominant category.
     */
    private WeekCell buildWeekCell(Cycle cycle, List<Commitment> commitments) {
        int total = commitments.size();
        Map<String, Integer> counts = new HashMap<>();
        long linkedToRallyCry = 0;
        for (Commitment c : commitments) {
            String key = c.getChessCategory() != null
                    ? CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())
                    : "Uncategorized";
            counts.merge(key, 1, Integer::sum);
            if (c.getRallyCry() != null) {
                linkedToRallyCry++;
            }
        }

        double strategicPct = pct(counts.getOrDefault("Strategic", 0), total);
        double operationalPct = pct(counts.getOrDefault("Operational", 0), total);
        double defensivePct = pct(counts.getOrDefault("Defensive", 0), total);
        double capabilityPct = pct(counts.getOrDefault("Capability Building", 0), total);
        double rallyCoveragePct = total > 0 ? (linkedToRallyCry * 100.0 / total) : 0.0;

        String dominantCategory = null;
        if (total > 0) {
            double max = Math.max(Math.max(strategicPct, operationalPct),
                    Math.max(defensivePct, capabilityPct));
            if (max == strategicPct) dominantCategory = "Strategic";
            else if (max == operationalPct) dominantCategory = "Operational";
            else if (max == defensivePct) dominantCategory = "Defensive";
            else dominantCategory = "Capability Building";
        }

        return new WeekCell(
                cycle.getId(),
                cycle.getLabel(),
                dominantCategory,
                strategicPct,
                operationalPct,
                defensivePct,
                capabilityPct,
                rallyCoveragePct,
                total
        );
    }

    /**
     * Builds an {@link AlignmentDataPoint} from a cycle and its commitments.
     * Category percentages are computed relative to total commitment count.
     */
    private AlignmentDataPoint buildAlignmentDataPoint(Cycle cycle, List<Commitment> commitments) {
        int total = commitments.size();
        Map<String, Integer> counts = new HashMap<>();

        long linkedToRallyCry = 0;
        for (Commitment c : commitments) {
            String key = c.getChessCategory() != null
                    ? CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())
                    : "Uncategorized";
            counts.merge(key, 1, Integer::sum);
            if (c.getRallyCry() != null) {
                linkedToRallyCry++;
            }
        }

        double rallyCoveragePct = total > 0 ? (linkedToRallyCry * 100.0 / total) : 0.0;

        return new AlignmentDataPoint(
                cycle.getId(),
                cycle.getLabel(),
                cycle.getStartsAt(),
                pct(counts.getOrDefault("Strategic", 0), total),
                pct(counts.getOrDefault("Operational", 0), total),
                pct(counts.getOrDefault("Defensive", 0), total),
                pct(counts.getOrDefault("Capability Building", 0), total),
                rallyCoveragePct,
                total
        );
    }

    /**
     * Builds a {@link CompletionDataPoint} from a cycle, its commitments, and reconciliation records.
     * Rates are computed as fractions of total commitment count.
     */
    private CompletionDataPoint buildCompletionDataPoint(Cycle cycle,
                                                          List<Commitment> commitments,
                                                          List<ReconciliationRecord> records) {
        int total = commitments.size();

        Map<ReconciliationStatus, Long> statusCounts = records.stream()
                .collect(Collectors.groupingBy(ReconciliationRecord::getStatus, Collectors.counting()));

        long completed = statusCounts.getOrDefault(ReconciliationStatus.COMPLETED, 0L)
                + statusCounts.getOrDefault(ReconciliationStatus.PARTIALLY_COMPLETED, 0L);
        long carriedForward = statusCounts.getOrDefault(ReconciliationStatus.CARRIED_FORWARD, 0L);
        long notStarted = statusCounts.getOrDefault(ReconciliationStatus.NOT_STARTED, 0L);
        int reconciledCount = records.size();

        return new CompletionDataPoint(
                cycle.getId(),
                cycle.getLabel(),
                cycle.getStartsAt(),
                pct((int) completed, total),
                pct((int) carriedForward, total),
                pct((int) notStarted, total),
                total,
                reconciledCount
        );
    }

    /** Compute percentage, returning 0.0 when total is 0 to avoid division by zero. */
    private static double pct(int count, int total) {
        return total == 0 ? 0.0 : (double) count / total * 100.0;
    }
}
