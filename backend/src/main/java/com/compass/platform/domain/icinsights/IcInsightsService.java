package com.compass.platform.domain.icinsights;

import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.briefing.BriefingPromptBuilder;
import com.compass.platform.domain.briefing.LlmBriefingService;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.growth.GrowthArea;
import com.compass.platform.domain.growth.GrowthAreaRepository;
import com.compass.platform.domain.icinsights.dto.GrowthAreaAlignmentDetail;
import com.compass.platform.domain.icinsights.dto.GrowthAreaHit;
import com.compass.platform.domain.icinsights.dto.GrowthAreaProgress;
import com.compass.platform.domain.icinsights.dto.HistoryCommitment;
import com.compass.platform.domain.icinsights.dto.IcWeekSummaryResponse;
import com.compass.platform.domain.icinsights.dto.MyStoryResponse;
import com.compass.platform.domain.icinsights.dto.PatternStats;
import com.compass.platform.domain.icinsights.dto.RollingHistoryResponse;
import com.compass.platform.domain.icinsights.dto.WeekGroup;
import com.compass.platform.domain.icinsights.dto.WeekSnapshot;
import com.compass.platform.domain.icinsights.dto.WeeklyCount;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Computes IC (individual contributor) execution insights:
 * <ul>
 *   <li>{@link #computeWeekSummary} — single-cycle summary with growth area hits and LLM narrative</li>
 *   <li>{@link #computeMyStory} — longitudinal view across the last N reconciled cycles</li>
 * </ul>
 *
 * <p>N+1 prevention: all multi-cycle commitment loads use a single batch query.
 * LLM calls delegate to {@link LlmBriefingService} thin wrappers; null is returned
 * on failure and the frontend handles it gracefully.
 */
@Service
@Transactional(readOnly = true)
public class IcInsightsService {

    private static final Logger log = LoggerFactory.getLogger(IcInsightsService.class);
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_INSTANT;

    private final CommitmentRepository commitmentRepository;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final CycleRepository cycleRepository;
    private final GrowthAreaRepository growthAreaRepository;
    private final LlmBriefingService llmBriefingService;
    private final BriefingPromptBuilder promptBuilder;

    public IcInsightsService(CommitmentRepository commitmentRepository,
                              ReconciliationRecordRepository reconciliationRecordRepository,
                              CycleRepository cycleRepository,
                              GrowthAreaRepository growthAreaRepository,
                              LlmBriefingService llmBriefingService,
                              BriefingPromptBuilder promptBuilder) {
        this.commitmentRepository = commitmentRepository;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.cycleRepository = cycleRepository;
        this.growthAreaRepository = growthAreaRepository;
        this.llmBriefingService = llmBriefingService;
        this.promptBuilder = promptBuilder;
    }

    // ═══════════════════════════════════════════════════════════════
    // Week Summary
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute a single-cycle execution summary for the authenticated IC.
     *
     * @param userId  the authenticated user's ID
     * @param orgId   the user's org (for cycle scoping)
     * @param cycleId the cycle to summarize
     */
    public IcWeekSummaryResponse computeWeekSummary(UUID userId, UUID orgId, UUID cycleId) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        if (!cycle.getOrg().getId().equals(orgId)) {
            throw new AccessDeniedException("Cycle does not belong to the requesting org");
        }

        List<Commitment> commitments = commitmentRepository
                .findByUserIdAndCycleIdOrderByPriorityRankAsc(userId, cycleId);

        Set<UUID> commitmentIds = commitments.stream()
                .map(Commitment::getId)
                .collect(Collectors.toSet());

        List<ReconciliationRecord> records = commitmentIds.isEmpty()
                ? List.of()
                : reconciliationRecordRepository.findByCommitmentIdIn(commitmentIds);

        Map<UUID, ReconciliationRecord> recordByCommitmentId = records.stream()
                .collect(Collectors.toMap(r -> r.getCommitment().getId(), r -> r, (a, b) -> a));

        // Status counts — only count planned (non-unplanned) commitments for status breakdown
        List<Commitment> planned = commitments.stream()
                .filter(c -> !c.isUnplanned())
                .collect(Collectors.toList());

        int totalPlanned = planned.size();
        int unplanned = (int) commitments.stream().filter(Commitment::isUnplanned).count();

        int completed = 0;
        int partiallyCompleted = 0;
        int notStarted = 0;
        int carriedForward = 0;
        int displacementCount = 0;

        for (Commitment c : planned) {
            ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
            if (rec == null) {
                notStarted++;
            } else {
                switch (rec.getStatus()) {
                    case COMPLETED -> completed++;
                    case PARTIALLY_COMPLETED -> partiallyCompleted++;
                    case NOT_STARTED -> notStarted++;
                    case CARRIED_FORWARD -> carriedForward++;
                }
                if (rec.getDisplacementCategory() != null) {
                    displacementCount++;
                }
            }
        }

        // Growth area hits — count commitments that have at least one growth area
        Map<UUID, GrowthAreaHit> growthAreaHitMap = new LinkedHashMap<>();
        int commitmentsWithGrowthAreas = 0;

        for (Commitment c : commitments) {
            Set<GrowthArea> areas = c.getGrowthAreas();
            if (!areas.isEmpty()) {
                commitmentsWithGrowthAreas++;
                for (GrowthArea ga : areas) {
                    growthAreaHitMap.merge(
                            ga.getId(),
                            new GrowthAreaHit(ga.getId(), ga.getLabel(), 1),
                            (existing, incoming) -> new GrowthAreaHit(
                                    existing.growthAreaId(),
                                    existing.label(),
                                    existing.commitmentCount() + 1
                            )
                    );
                }
            }
        }

        int total = commitments.size();
        double completionRate = totalPlanned > 0
                ? (completed + partiallyCompleted * 0.5) / totalPlanned * 100.0
                : 0.0;
        double personalAlignmentPct = total > 0
                ? (double) commitmentsWithGrowthAreas / total * 100.0
                : 0.0;

        List<GrowthAreaHit> growthAreaHits = new ArrayList<>(growthAreaHitMap.values());
        growthAreaHits.sort(Comparator.comparingInt(GrowthAreaHit::commitmentCount).reversed());

        // LLM narrative
        String narrativeSummary = generateWeekNarrative(
                userId, commitments, growthAreaHits, totalPlanned, completed,
                partiallyCompleted, notStarted, carriedForward, unplanned, displacementCount);

        return new IcWeekSummaryResponse(
                cycle.getId(),
                cycle.getLabel(),
                ISO_DATE.format(cycle.getStartsAt()),
                ISO_DATE.format(cycle.getEndsAt()),
                totalPlanned,
                completed,
                partiallyCompleted,
                notStarted,
                carriedForward,
                unplanned,
                Math.round(completionRate * 10.0) / 10.0,
                Math.round(personalAlignmentPct * 10.0) / 10.0,
                growthAreaHits,
                displacementCount,
                narrativeSummary
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // My Story
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute longitudinal execution story for the authenticated IC
     * across the last {@code weeks} reconciled cycles.
     *
     * @param userId the authenticated user's ID
     * @param orgId  the user's org (for cycle scoping)
     * @param weeks  number of recent reconciled cycles to include (max 52)
     */
    public MyStoryResponse computeMyStory(UUID userId, UUID orgId, com.compass.platform.domain.observatory.dto.TimeScope scope) {
        // Load reconciled cycles for the requested window
        List<Cycle> window;
        if (scope.isDateRange()) {
            window = cycleRepository.findReconciledByOrgIdAndDateRange(orgId, scope.dateFrom(), scope.dateTo());
        } else {
            List<Cycle> reconciledCycles = cycleRepository
                    .findByOrgIdAndStateOrderByStartsAtDesc(orgId, CycleState.RECONCILED);
            window = reconciledCycles.stream()
                    .limit(scope.effectiveWeekCount())
                    .collect(Collectors.toList());
        }

        if (window.isEmpty()) {
            return emptyStory();
        }

        List<UUID> cycleIds = window.stream().map(Cycle::getId).collect(Collectors.toList());

        // Single batch query — no N+1
        List<Commitment> allCommitments = commitmentRepository
                .findByUserIdInAndCycleIdIn(List.of(userId), cycleIds);

        // Batch-load all reconciliation records for those commitments
        Set<UUID> commitmentIds = allCommitments.stream()
                .map(Commitment::getId)
                .collect(Collectors.toSet());

        List<ReconciliationRecord> allRecords = commitmentIds.isEmpty()
                ? List.of()
                : reconciliationRecordRepository.findByCommitmentIdIn(commitmentIds);

        Map<UUID, ReconciliationRecord> recordByCommitmentId = allRecords.stream()
                .collect(Collectors.toMap(r -> r.getCommitment().getId(), r -> r, (a, b) -> a));

        // Index commitments by cycle
        Map<UUID, List<Commitment>> byCycle = allCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getCycle().getId()));

        // Build per-cycle snapshots (chronological order for display)
        List<WeekSnapshot> weekSnapshots = new ArrayList<>();
        Map<UUID, String> cycleLabels = new HashMap<>();
        for (Cycle cycle : window) {
            cycleLabels.put(cycle.getId(), cycle.getLabel());
        }

        // Reverse so snapshots are chronological (oldest first for trend rendering)
        List<Cycle> chronological = new ArrayList<>(window);
        java.util.Collections.reverse(chronological);

        for (Cycle cycle : chronological) {
            List<Commitment> cycleCommits = byCycle.getOrDefault(cycle.getId(), List.of());
            int count = cycleCommits.size();
            int completedCount = 0;
            int commitsWithGrowthAreas = 0;

            for (Commitment c : cycleCommits) {
                ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                if (rec != null && rec.getStatus() == ReconciliationStatus.COMPLETED) {
                    completedCount++;
                }
                if (!c.getGrowthAreas().isEmpty()) {
                    commitsWithGrowthAreas++;
                }
            }

            double completionRate = count > 0 ? (double) completedCount / count * 100.0 : 0.0;
            double personalAlignmentPct = count > 0
                    ? (double) commitsWithGrowthAreas / count * 100.0
                    : 0.0;

            weekSnapshots.add(new WeekSnapshot(
                    cycle.getId(),
                    cycle.getLabel(),
                    ISO_DATE.format(cycle.getStartsAt()),
                    ISO_DATE.format(cycle.getEndsAt()),
                    count,
                    completedCount,
                    Math.round(completionRate * 10.0) / 10.0,
                    Math.round(personalAlignmentPct * 10.0) / 10.0
            ));
        }

        // Aggregate growth area progress across all cycles
        // Map: growthAreaId -> { label, list of (cycleLabel, commitmentIds that hit this GA) }
        Map<UUID, String> gaLabels = new LinkedHashMap<>();
        Map<UUID, Integer> gaTotalCommitments = new LinkedHashMap<>();
        Map<UUID, Integer> gaCompletedCommitments = new LinkedHashMap<>();
        Map<UUID, Map<String, Integer>> gaWeeklyCounts = new LinkedHashMap<>();

        for (Commitment c : allCommitments) {
            String cycleLabel = cycleLabels.get(c.getCycle().getId());
            ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
            boolean isCompleted = rec != null && rec.getStatus() == ReconciliationStatus.COMPLETED;

            for (GrowthArea ga : c.getGrowthAreas()) {
                UUID gaId = ga.getId();
                gaLabels.putIfAbsent(gaId, ga.getLabel());
                gaTotalCommitments.merge(gaId, 1, Integer::sum);
                if (isCompleted) {
                    gaCompletedCommitments.merge(gaId, 1, Integer::sum);
                }
                gaWeeklyCounts
                        .computeIfAbsent(gaId, k -> new LinkedHashMap<>())
                        .merge(cycleLabel, 1, Integer::sum);
            }
        }

        List<GrowthAreaProgress> growthAreaProgress = gaLabels.entrySet().stream()
                .map(entry -> {
                    UUID gaId = entry.getKey();
                    String label = entry.getValue();
                    int total = gaTotalCommitments.getOrDefault(gaId, 0);
                    int completedGA = gaCompletedCommitments.getOrDefault(gaId, 0);
                    Map<String, Integer> weekly = gaWeeklyCounts.getOrDefault(gaId, Map.of());
                    List<WeeklyCount> weeklyBreakdown = weekly.entrySet().stream()
                            .map(e -> new WeeklyCount(e.getKey(), e.getValue()))
                            .collect(Collectors.toList());
                    return new GrowthAreaProgress(gaId, label, total, completedGA, weeklyBreakdown);
                })
                .sorted(Comparator.comparingInt(GrowthAreaProgress::totalCommitments).reversed())
                .collect(Collectors.toList());

        // Pattern stats
        int totalCommitments = allCommitments.size();
        int totalCompleted = (int) allCommitments.stream()
                .filter(c -> {
                    ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                    return rec != null && rec.getStatus() == ReconciliationStatus.COMPLETED;
                })
                .count();
        int totalCarriedForward = (int) allCommitments.stream()
                .filter(c -> {
                    ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                    return rec != null && rec.getStatus() == ReconciliationStatus.CARRIED_FORWARD;
                })
                .count();
        int totalDisplacements = (int) allRecords.stream()
                .filter(r -> r.getDisplacementCategory() != null)
                .count();
        int totalUnplanned = (int) allCommitments.stream()
                .filter(Commitment::isUnplanned)
                .count();

        double overallCompletionRate = totalCommitments > 0
                ? (double) totalCompleted / totalCommitments * 100.0
                : 0.0;
        double overallCarryForwardRate = totalCommitments > 0
                ? (double) totalCarriedForward / totalCommitments * 100.0
                : 0.0;

        // Category distribution — chess category name → count
        Map<String, Integer> categoryDistribution = new LinkedHashMap<>();
        for (Commitment c : allCommitments) {
            if (c.getChessCategory() != null) {
                categoryDistribution.merge(c.getChessCategory().getName(), 1, Integer::sum);
            } else {
                categoryDistribution.merge("Uncategorized", 1, Integer::sum);
            }
        }

        PatternStats patternStats = new PatternStats(
                totalCommitments,
                totalCompleted,
                Math.round(overallCompletionRate * 10.0) / 10.0,
                Math.round(overallCarryForwardRate * 10.0) / 10.0,
                totalDisplacements,
                totalUnplanned,
                categoryDistribution
        );

        // ── Growth Alignment Details ──────────────────────────────────────────
        // Overall alignment pct: commitments with ≥1 growth area / total
        long alignedCommitmentsCount = allCommitments.stream()
                .filter(c -> !c.getGrowthAreas().isEmpty())
                .count();
        double overallAlignmentPct = totalCommitments > 0
                ? (double) alignedCommitmentsCount / totalCommitments * 100.0
                : 0.0;

        // Build a map from growthAreaId -> GrowthArea for ALL growth areas (active + inactive)
        List<GrowthArea> allUserGrowthAreas = growthAreaRepository.findByUserIdOrderBySortOrderAsc(userId);
        Map<UUID, GrowthArea> allGaById = allUserGrowthAreas.stream()
                .collect(Collectors.toMap(GrowthArea::getId, ga -> ga));

        // Per growth area: collect commitments linked to it
        // Key: growthAreaId, Value: ordered list of commitments (most recent cycle first, then alpha by title)
        Map<UUID, List<Commitment>> commitmentsByGaId = new LinkedHashMap<>();

        // Seed with all known GAs (so active GAs with 0 tasks are still included)
        for (GrowthArea ga : allUserGrowthAreas) {
            commitmentsByGaId.put(ga.getId(), new ArrayList<>());
        }

        // Build cycle start time index for sorting (most recent cycle first)
        Map<UUID, java.time.Instant> cycleStartById = window.stream()
                .collect(Collectors.toMap(Cycle::getId, Cycle::getStartsAt));

        for (Commitment c : allCommitments) {
            for (GrowthArea ga : c.getGrowthAreas()) {
                commitmentsByGaId
                        .computeIfAbsent(ga.getId(), k -> new ArrayList<>())
                        .add(c);
                // Ensure we have the GA object even if not in allUserGrowthAreas (edge case)
                allGaById.putIfAbsent(ga.getId(), ga);
            }
        }

        // Sort each GA's commitments: most recent cycle first, then alphabetical by title
        Comparator<Commitment> commitmentOrder = Comparator
                .<Commitment, java.time.Instant>comparing(
                        c -> cycleStartById.getOrDefault(c.getCycle().getId(), java.time.Instant.EPOCH))
                .reversed()
                .thenComparing(Commitment::getTitle);

        List<GrowthAreaAlignmentDetail> growthAreaAlignmentDetails = new ArrayList<>();
        for (Map.Entry<UUID, List<Commitment>> entry : commitmentsByGaId.entrySet()) {
            UUID gaId = entry.getKey();
            GrowthArea ga = allGaById.get(gaId);
            if (ga == null) continue;  // should not happen

            List<Commitment> gaCommitments = entry.getValue();
            gaCommitments.sort(commitmentOrder);

            int alignedCount = gaCommitments.size();
            int completedGaCount = (int) gaCommitments.stream()
                    .filter(c -> {
                        ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                        return rec != null && rec.getStatus() == ReconciliationStatus.COMPLETED;
                    })
                    .count();

            // Top 3 tasks
            List<GrowthAreaAlignmentDetail.AlignedTask> topTasks = gaCommitments.stream()
                    .limit(3)
                    .map(c -> {
                        ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                        String reconStatus = rec != null ? rec.getStatus().name() : null;
                        String cyCleLabel = cycleLabels.getOrDefault(c.getCycle().getId(), "");
                        return new GrowthAreaAlignmentDetail.AlignedTask(
                                c.getId(), c.getTitle(), cyCleLabel, reconStatus);
                    })
                    .collect(Collectors.toList());

            growthAreaAlignmentDetails.add(new GrowthAreaAlignmentDetail(
                    gaId, ga.getLabel(), ga.isActive(),
                    alignedCount, completedGaCount, topTasks));
        }

        // Sort: areas with linked commitments first (descending count), then active > inactive,
        // then alphabetical by label
        growthAreaAlignmentDetails.sort(Comparator
                .<GrowthAreaAlignmentDetail>comparingInt(d -> -d.alignedCommitmentCount())
                .thenComparing(d -> !d.isActive())
                .thenComparing(GrowthAreaAlignmentDetail::label));

        // LLM insights
        String narrativeInsight = null;
        List<String> resumeBullets = null;

        try {
            Map<String, Integer> gaHitMap = gaTotalCommitments.entrySet().stream()
                    .collect(Collectors.toMap(
                            e -> gaLabels.getOrDefault(e.getKey(), e.getKey().toString()),
                            Map.Entry::getValue
                    ));
            List<String> recentTitles = allCommitments.stream()
                    .limit(20)
                    .map(Commitment::getTitle)
                    .collect(Collectors.toList());

            String systemPrompt = BriefingPromptBuilder.IC_MY_STORY_SYSTEM_PROMPT;
            String userPrompt = promptBuilder.buildIcMyStoryPrompt(
                    userId.toString(), window.size(), totalCommitments,
                    gaHitMap, recentTitles, overallCompletionRate, totalDisplacements);

            LlmBriefingService.IcMyStoryLlmResult result =
                    llmBriefingService.generateMyStoryInsights(systemPrompt, userPrompt);

            if (result != null) {
                narrativeInsight = result.narrative();
                resumeBullets = result.resumeBullets();
            }
        } catch (Exception e) {
            log.warn("My Story LLM call failed for userId={}: {}", userId, e.getMessage());
        }

        return new MyStoryResponse(growthAreaProgress, weekSnapshots, patternStats,
                narrativeInsight, resumeBullets,
                Math.round(overallAlignmentPct * 10.0) / 10.0,
                growthAreaAlignmentDetails);
    }

    // ═══════════════════════════════════════════════════════════════
    // Rolling History
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compute rolling work history for the given user across a paginated window
     * of RECONCILED cycles (most-recent first).
     *
     * <p>N+1 prevention: commitments and reconciliation records are loaded in
     * two batch queries; growth areas are loaded eagerly via Hibernate BatchSize.
     *
     * @param userId  the target user's ID
     * @param orgId   the user's org (for cycle scoping)
     * @param offset  zero-based index into the full list of reconciled cycles
     * @param limit   number of cycles to return starting at offset
     */
    public RollingHistoryResponse computeRollingHistory(UUID userId, UUID orgId, int offset, int limit,
                                                          java.time.Instant dateFrom, java.time.Instant dateTo) {
        // Load reconciled cycles, optionally pre-filtered by date range
        List<Cycle> reconciledCycles;
        if (dateFrom != null && dateTo != null) {
            reconciledCycles = cycleRepository.findReconciledByOrgIdAndDateRange(orgId, dateFrom, dateTo);
        } else {
            reconciledCycles = cycleRepository
                    .findByOrgIdAndStateOrderByStartsAtDesc(orgId, CycleState.RECONCILED);
        }

        int totalCycles = reconciledCycles.size();
        int fromIndex = Math.min(offset, totalCycles);
        int toIndex = Math.min(offset + limit, totalCycles);
        boolean hasMore = toIndex < totalCycles;
        int nextOffset = offset + limit;

        List<Cycle> window = reconciledCycles.subList(fromIndex, toIndex);

        if (window.isEmpty()) {
            return new RollingHistoryResponse(List.of(), false, nextOffset);
        }

        List<UUID> cycleIds = window.stream().map(Cycle::getId).collect(Collectors.toList());

        // Single batch query — no N+1
        List<Commitment> allCommitments = commitmentRepository
                .findByUserIdInAndCycleIdIn(List.of(userId), cycleIds);

        // Batch-load all reconciliation records for those commitments
        Set<UUID> commitmentIds = allCommitments.stream()
                .map(Commitment::getId)
                .collect(Collectors.toSet());

        List<ReconciliationRecord> allRecords = commitmentIds.isEmpty()
                ? List.of()
                : reconciliationRecordRepository.findByCommitmentIdIn(commitmentIds);

        Map<UUID, ReconciliationRecord> recordByCommitmentId = allRecords.stream()
                .collect(Collectors.toMap(
                        r -> r.getCommitment().getId(), r -> r, (a, b) -> a));

        // Index commitments by cycle
        Map<UUID, List<Commitment>> byCycle = allCommitments.stream()
                .collect(Collectors.groupingBy(c -> c.getCycle().getId()));

        // Build week groups — window is already most-recent first
        List<WeekGroup> weekGroups = new ArrayList<>();
        for (Cycle cycle : window) {
            List<Commitment> cycleCommits = byCycle.getOrDefault(cycle.getId(), List.of());

            List<HistoryCommitment> historyCommitments = cycleCommits.stream()
                    .sorted(Comparator.comparingInt(Commitment::getPriorityRank))
                    .map(c -> {
                        ReconciliationRecord rec = recordByCommitmentId.get(c.getId());
                        String reconStatus = rec != null ? rec.getStatus().name() : null;

                        String rallyCryTitle = c.getRallyCry() != null
                                ? c.getRallyCry().getTitle()
                                : null;

                        String chessCategoryName = c.getChessCategory() != null
                                ? c.getChessCategory().getName()
                                : null;

                        List<String> growthAreaLabels = c.getGrowthAreas().stream()
                                .map(ga -> ga.getLabel())
                                .sorted()
                                .collect(Collectors.toList());

                        String assignedByName = c.getAssignedBy() != null
                                ? c.getAssignedBy().getDisplayName()
                                : null;

                        return new HistoryCommitment(
                                c.getId(),
                                c.getTitle(),
                                reconStatus,
                                rallyCryTitle,
                                chessCategoryName,
                                growthAreaLabels,
                                c.isUnplanned(),
                                assignedByName
                        );
                    })
                    .collect(Collectors.toList());

            weekGroups.add(new WeekGroup(
                    cycle.getId(),
                    cycle.getLabel(),
                    ISO_DATE.format(cycle.getStartsAt()),
                    ISO_DATE.format(cycle.getEndsAt()),
                    cycle.getState().name(),
                    historyCommitments
            ));
        }

        return new RollingHistoryResponse(weekGroups, hasMore, nextOffset);
    }

    // ═══════════════════════════════════════════════════════════════
    // LLM helpers
    // ═══════════════════════════════════════════════════════════════

    private String generateWeekNarrative(UUID userId, List<Commitment> commitments,
                                          List<GrowthAreaHit> growthAreaHits,
                                          int totalPlanned, int completed, int partiallyCompleted,
                                          int notStarted, int carriedForward, int unplanned,
                                          int displacementCount) {
        try {
            List<String> titles = commitments.stream()
                    .map(Commitment::getTitle)
                    .limit(15)
                    .collect(Collectors.toList());
            List<String> allGaLabels = growthAreaHits.stream()
                    .map(GrowthAreaHit::label)
                    .collect(Collectors.toList());
            List<String> hitLabels = growthAreaHits.stream()
                    .filter(h -> h.commitmentCount() > 0)
                    .map(GrowthAreaHit::label)
                    .collect(Collectors.toList());

            String systemPrompt = BriefingPromptBuilder.IC_WEEK_SUMMARY_SYSTEM_PROMPT;
            String userPrompt = promptBuilder.buildIcWeekSummaryPrompt(
                    userId.toString(), totalPlanned, completed, partiallyCompleted,
                    notStarted, carriedForward, unplanned, displacementCount,
                    titles, allGaLabels, hitLabels);

            return llmBriefingService.generateIcWeekSummary(systemPrompt, userPrompt);
        } catch (Exception e) {
            log.warn("Week summary LLM call failed for userId={}: {}", userId, e.getMessage());
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Fallback
    // ═══════════════════════════════════════════════════════════════

    private MyStoryResponse emptyStory() {
        PatternStats empty = new PatternStats(0, 0, 0.0, 0.0, 0, 0, Map.of());
        return new MyStoryResponse(List.of(), List.of(), empty, null, null, 0.0, List.of());
    }
}
