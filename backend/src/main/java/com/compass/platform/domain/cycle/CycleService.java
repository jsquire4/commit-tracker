package com.compass.platform.domain.cycle;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.briefing.NarrativeGenerationService;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.commit.CommitmentService;
import com.compass.platform.domain.cycle.CycleStateMachine.TransitionContext;
import com.compass.platform.domain.cycle.CycleStateMachine.TransitionResult;
import com.compass.platform.domain.cycle.dto.CycleFilters;
import com.compass.platform.domain.cycle.dto.CycleHistoryResponse;
import com.compass.platform.domain.cycle.dto.TransitionRequest;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class CycleService {

    private static final Logger log = LoggerFactory.getLogger(CycleService.class);

    private final CycleRepository cycleRepository;
    private final CommitmentRepository commitmentRepository;
    private final CommitmentService commitmentService;
    private final ReconciliationRecordRepository reconciliationRecordRepository;
    private final AuditService auditService;
    private final CycleStateMachine stateMachine;
    private final NarrativeGenerationService narrativeGenerationService;

    public CycleService(CycleRepository cycleRepository,
                        CommitmentRepository commitmentRepository,
                        CommitmentService commitmentService,
                        ReconciliationRecordRepository reconciliationRecordRepository,
                        AuditService auditService,
                        NarrativeGenerationService narrativeGenerationService) {
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.commitmentService = commitmentService;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.auditService = auditService;
        this.narrativeGenerationService = narrativeGenerationService;
        this.stateMachine = new CycleStateMachine();
    }

    /**
     * Get the current active cycle for the actor's org.
     * Cycles are org-wide — all users share the same cycle.
     * If no active cycle exists for the current week, create one (DRAFT).
     * Cycle week boundaries: Monday 00:00 UTC to Sunday 23:59:59 UTC
     * (adjusted by org timezone from the Org entity).
     * Label format: "Week of Mar 10, 2026"
     */
    public Cycle getCurrentCycle(AppUser actor) {
        Org org = actor.getOrg();
        Optional<Cycle> existing = cycleRepository.findByOrgIdAndIsActiveTrue(org.getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        String timezone = org.getTimezone() != null ? org.getTimezone() : "UTC";
        Instant now = Instant.now();
        Instant weekStart = computeWeekStart(now, timezone);

        // Check if a cycle already exists for this week (may be RECONCILED or another state)
        Optional<Cycle> existingForWeek = cycleRepository.findByOrgIdAndStartsAt(org.getId(), weekStart);
        if (existingForWeek.isPresent()) {
            return existingForWeek.get();
        }

        Instant weekEnd = computeWeekEnd(weekStart);
        String label = computeLabel(weekStart, timezone);

        return createDraftCycle(org, weekStart, weekEnd, label);
    }

    /**
     * Get specific cycle by ID. Actor must be in the same org.
     * Throws AccessDeniedException if different org.
     */
    public Cycle getCycle(UUID cycleId, AppUser actor) {
        Cycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new EntityNotFoundException("Cycle", cycleId));

        if (!cycle.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("Access denied: cycle belongs to a different org");
        }

        return cycle;
    }

    /**
     * Execute a state transition on a cycle.
     * Only MANAGER and above may invoke this.
     */
    public Cycle transition(UUID cycleId, TransitionRequest request, AppUser actor) {
        UserRole role = actor.getRole();
        if (role == UserRole.ANALYST || role == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Only managers and above can manage cycle transitions");
        }

        Cycle cycle = getCycle(cycleId, actor);

        int commitmentCount = (int) commitmentRepository
                .countByOrgIdAndCycleId(actor.getOrg().getId(), cycleId);

        List<Object[]> statusCounts = reconciliationRecordRepository
                .countByOrgIdAndCycleIdGroupByStatus(actor.getOrg().getId(), cycleId);
        Map<ReconciliationStatus, Long> countByStatus = statusCounts.stream()
                .collect(Collectors.toMap(
                        row -> (ReconciliationStatus) row[0],
                        row -> (Long) row[1]
                ));
        int reconciledCount = countByStatus.values().stream()
                .mapToInt(Long::intValue)
                .sum();

        String orgTimezone = actor.getOrg().getTimezone() != null ? actor.getOrg().getTimezone() : "UTC";
        TransitionContext context = new TransitionContext(
                commitmentCount,
                reconciledCount,
                commitmentCount,
                Instant.now(),
                orgTimezone
        );

        CycleState targetState = request.targetState();
        TransitionResult result = stateMachine.validate(cycle, targetState, actor, context);

        if (!result.allowed()) {
            throw new ConflictException(result.rejectionReason());
        }

        CycleState fromState = cycle.getState();
        cycle.setState(targetState);

        if (targetState == CycleState.RECONCILED) {
            cycle.setActive(false);
        }

        auditService.log(
                actor.getOrg().getId(),
                "CYCLE",
                cycleId,
                "STATE_TRANSITION",
                actor,
                Map.of(
                        "from", fromState.name(),
                        "to", targetState.name(),
                        "reason", request.reason() != null ? request.reason() : ""
                )
        );

        log.info("Cycle state transition: cycleId={} from={} to={} actorId={} actorRole={}",
                cycleId, fromState, targetState, actor.getId(), actor.getRole());

        if (targetState == CycleState.RECONCILED) {
            completeCycle(cycle, actor);
        }

        return cycle;
    }

    /**
     * Called after RECONCILED transition.
     * Orchestrates carry-forward for the org.
     */
    void completeCycle(Cycle cycle, AppUser actor) {
        List<ReconciliationRecord> records = reconciliationRecordRepository
                .findByOrgIdAndCycleId(actor.getOrg().getId(), cycle.getId());

        List<Commitment> carriedForwardCommitments = records.stream()
                .filter(r -> r.getStatus() == ReconciliationStatus.CARRIED_FORWARD)
                .map(ReconciliationRecord::getCommitment)
                .collect(Collectors.toList());

        if (carriedForwardCommitments.isEmpty()) {
            log.info("completeCycle: no carry-forward items for cycleId={}", cycle.getId());
            // Still generate sealed narratives even when nothing was carried forward
            try {
                narrativeGenerationService.generateNarrativesForCycle(actor.getOrg().getId(), cycle.getId());
            } catch (Exception e) {
                log.error("Narrative generation hook failed for cycleId={}: {}", cycle.getId(), e.getMessage(), e);
            }
            return;
        }

        // Find or create the next week's DRAFT cycle
        // NOTE: Do NOT truncate to UTC midnight — that shifts the timestamp to the previous
        // evening in US timezones, causing computeWeekStart to snap back to the CURRENT week.
        Instant nextWeekStart = cycle.getEndsAt().plusSeconds(1);
        // Align to next Monday
        String timezone = actor.getOrg().getTimezone() != null ? actor.getOrg().getTimezone() : "UTC";
        Instant nextWeekAlignedStart = computeWeekStart(nextWeekStart, timezone);
        Instant nextWeekEnd = computeWeekEnd(nextWeekAlignedStart);
        String nextLabel = computeLabel(nextWeekAlignedStart, timezone);

        Cycle nextCycle = cycleRepository.findByOrgIdAndStartsAt(actor.getOrg().getId(), nextWeekAlignedStart)
                .orElseGet(() -> createDraftCycle(actor.getOrg(), nextWeekAlignedStart, nextWeekEnd, nextLabel));

        for (Commitment original : carriedForwardCommitments) {
            Commitment savedClone = commitmentService.cloneForCarryForward(original, nextCycle);
            log.info("completeCycle: carried forward commitment originalId={} cloneId={} userId={} cycleId={}",
                    original.getId(), savedClone.getId(), original.getUser().getId(), nextCycle.getId());
        }

        // Generate sealed narratives (S1, S3, S4) — fire-and-forget; never blocks the transition
        try {
            narrativeGenerationService.generateNarrativesForCycle(actor.getOrg().getId(), cycle.getId());
        } catch (Exception e) {
            log.error("Narrative generation hook failed for cycleId={}: {}", cycle.getId(), e.getMessage(), e);
        }
    }

    /**
     * Returns the number of commitments in the given cycle for the actor's org.
     */
    public int getCommitmentCount(UUID orgId, UUID cycleId) {
        return (int) commitmentRepository.countByOrgIdAndCycleId(orgId, cycleId);
    }

    /**
     * List cycle history for the org. Actor must be in the same org.
     * Queries only cycles belonging to the given org, then applies in-memory filters.
     */
    public Page<Cycle> listCycles(UUID orgId, CycleFilters filters, Pageable pageable) {
        return cycleRepository.findByOrgIdWithFilters(
                orgId,
                filters.state(),
                filters.dateFrom(),
                filters.dateTo(),
                pageable);
    }

    /**
     * Get cycle history for an org, ordered by startsAt descending, limited to 12 entries.
     * Returns lightweight DTOs suitable for cycle selector UIs.
     *
     * TODO: Add test coverage for getCycleHistory — currently untested.
     */
    public List<CycleHistoryResponse> getCycleHistory(UUID orgId) {
        List<Cycle> cycles = cycleRepository.findTop12ByOrgIdOrderByStartsAtDesc(orgId);
        return cycles.stream()
                .map(c -> new CycleHistoryResponse(
                        c.getId(),
                        c.getLabel(),
                        c.getState(),
                        c.getStartsAt(),
                        c.getEndsAt()
                ))
                .toList();
    }

    /**
     * Start the next week's cycle from a given RECONCILED cycle.
     * Creates a new DRAFT cycle for the week following the given cycle.
     * If a cycle already exists for that week, returns it.
     */
    public Cycle startNextCycle(UUID fromCycleId, AppUser actor) {
        Cycle fromCycle = getCycle(fromCycleId, actor);
        if (fromCycle.getState() != CycleState.RECONCILED) {
            throw new IllegalStateException("Can only start next week from a RECONCILED cycle (current state: " + fromCycle.getState() + ")");
        }

        String timezone = actor.getOrg().getTimezone() != null ? actor.getOrg().getTimezone() : "UTC";
        Instant nextWeekStart = computeWeekStart(fromCycle.getEndsAt().plusSeconds(1), timezone);
        Instant nextWeekEnd = computeWeekEnd(nextWeekStart);
        String label = computeLabel(nextWeekStart, timezone);

        return cycleRepository.findByOrgIdAndStartsAt(actor.getOrg().getId(), nextWeekStart)
                .orElseGet(() -> createDraftCycle(actor.getOrg(), nextWeekStart, nextWeekEnd, label));
    }

    // === Internal helpers ===

    Cycle createDraftCycle(Org org, Instant weekStart, Instant weekEnd, String label) {
        Cycle cycle = Cycle.builder()
                .org(org)
                .label(label)
                .state(CycleState.DRAFT)
                .startsAt(weekStart)
                .endsAt(weekEnd)
                .isActive(true)
                .build();
        return cycleRepository.save(cycle);
    }

    /**
     * Compute the start of the ISO week (Monday 00:00) containing {@code now},
     * interpreted in the given timezone, then returned as UTC Instant.
     */
    Instant computeWeekStart(Instant now, String timezone) {
        ZoneId zone = ZoneId.of(timezone);
        ZonedDateTime zdt = now.atZone(zone);
        // Day of week: Monday=1, Sunday=7 (ISO)
        int dayOfWeek = zdt.getDayOfWeek().getValue(); // 1=Mon ... 7=Sun
        ZonedDateTime monday = zdt.minusDays(dayOfWeek - 1)
                .withHour(0).withMinute(0).withSecond(0).withNano(0);
        return monday.toInstant();
    }

    /**
     * Compute the end of the week: Sunday 23:59:59 UTC (6 days after weekStart).
     */
    Instant computeWeekEnd(Instant weekStart) {
        return weekStart.plus(6, ChronoUnit.DAYS)
                .plus(23, ChronoUnit.HOURS)
                .plus(59, ChronoUnit.MINUTES)
                .plus(59, ChronoUnit.SECONDS);
    }

    /**
     * Compute label like "Week of Mar 10, 2026" from weekStart in given timezone.
     */
    private String computeLabel(Instant weekStart, String timezone) {
        ZoneId zone = ZoneId.of(timezone);
        ZonedDateTime zdt = weekStart.atZone(zone);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);
        return "Week of " + zdt.format(fmt);
    }
}
