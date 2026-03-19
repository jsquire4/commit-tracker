package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.observatory.dto.AlignmentDataPoint;
import com.st6.committracker.domain.observatory.dto.CarryForwardChain;
import com.st6.committracker.domain.observatory.dto.CompletionDataPoint;
import com.st6.committracker.domain.observatory.dto.CostWeightedSignal;
import com.st6.committracker.domain.observatory.dto.TeamAlignmentTrend;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

        List<AlignmentDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments =
                    commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycle.getId());
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

        List<CompletionDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments =
                    commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycle.getId());
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
        AppUser manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found: " + managerId));

        List<Cycle> cycles = latestCycles(orgId, weekCount);

        List<AlignmentDataPoint> dataPoints = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = teamUserIds.isEmpty()
                    ? List.of()
                    : commitmentRepository.findByUserIdInAndCycleId(teamUserIds, cycle.getId());
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

        List<Cycle> cycles = latestCycles(orgId, weekCount);
        List<UUID> cycleIds = cycles.stream().map(Cycle::getId).toList();

        // Bulk-load all org reconciliation records for this range, then filter to team
        List<ReconciliationRecord> allRecords =
                reconciliationRecordRepository.findByOrgIdAndCycleIdIn(orgId, cycleIds);

        Set<UUID> teamCommitmentIds;
        if (teamUserIds.isEmpty()) {
            teamCommitmentIds = Set.of();
        } else {
            // Collect commitment IDs belonging to the team across all cycles
            teamCommitmentIds = cycles.stream()
                    .flatMap(c -> commitmentRepository.findByUserIdInAndCycleId(teamUserIds, c.getId()).stream())
                    .map(Commitment::getId)
                    .collect(Collectors.toSet());
        }

        final Set<UUID> finalTeamCommitmentIds = teamCommitmentIds;
        Map<UUID, List<ReconciliationRecord>> recordsByCycle = allRecords.stream()
                .filter(r -> finalTeamCommitmentIds.contains(r.getCommitment().getId()))
                .collect(Collectors.groupingBy(r -> r.getCycle().getId()));

        List<CompletionDataPoint> results = new ArrayList<>();
        for (Cycle cycle : cycles) {
            List<Commitment> commitments = teamUserIds.isEmpty()
                    ? List.of()
                    : commitmentRepository.findByUserIdInAndCycleId(teamUserIds, cycle.getId());
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

    // ===== Internal helpers =====

    /**
     * Returns the most-recent {@code limit} RECONCILED cycles for the org,
     * fetched in descending order. Only reconciled cycles have meaningful data
     * for analytics — DRAFT and in-progress cycles are excluded.
     */
    private List<Cycle> latestCycles(UUID orgId, int limit) {
        List<Cycle> all = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);
        List<Cycle> reconciled = all.stream()
                .filter(c -> c.getState() == CycleState.RECONCILED)
                .toList();
        return reconciled.size() <= limit ? reconciled : reconciled.subList(0, limit);
    }

    /**
     * Builds an {@link AlignmentDataPoint} from a cycle and its commitments.
     * Category percentages are computed relative to total commitment count.
     */
    private AlignmentDataPoint buildAlignmentDataPoint(Cycle cycle, List<Commitment> commitments) {
        int total = commitments.size();
        Map<String, Integer> counts = new HashMap<>();

        for (Commitment c : commitments) {
            String key = c.getChessCategory() != null
                    ? CategoryUtils.normalizeCategoryName(c.getChessCategory().getName())
                    : "Uncategorized";
            counts.merge(key, 1, Integer::sum);
        }

        return new AlignmentDataPoint(
                cycle.getId(),
                cycle.getLabel(),
                cycle.getStartsAt(),
                pct(counts.getOrDefault("Strategic", 0), total),
                pct(counts.getOrDefault("Operational", 0), total),
                pct(counts.getOrDefault("Defensive", 0), total),
                pct(counts.getOrDefault("Capability Building", 0), total),
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
