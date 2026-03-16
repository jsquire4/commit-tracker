package com.st6.committracker.domain.cycle;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.CommitmentService;
import com.st6.committracker.domain.cycle.CycleStateMachine.TransitionContext;
import com.st6.committracker.domain.cycle.CycleStateMachine.TransitionResult;
import com.st6.committracker.domain.cycle.dto.CycleFilters;
import com.st6.committracker.domain.cycle.dto.TransitionRequest;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.security.VisibilityEnforcer;
import com.st6.committracker.shared.ConflictException;
import com.st6.committracker.shared.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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
    private final VisibilityEnforcer visibilityEnforcer;
    private final AuditService auditService;
    private final CycleStateMachine stateMachine;

    public CycleService(CycleRepository cycleRepository,
                        CommitmentRepository commitmentRepository,
                        CommitmentService commitmentService,
                        ReconciliationRecordRepository reconciliationRecordRepository,
                        VisibilityEnforcer visibilityEnforcer,
                        AuditService auditService) {
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.commitmentService = commitmentService;
        this.reconciliationRecordRepository = reconciliationRecordRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.auditService = auditService;
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

        int commitmentCount = commitmentRepository
                .findByOrgIdAndCycleIdOrderByPriorityRankAsc(actor.getOrg().getId(), cycleId).size();

        List<Object[]> statusCounts = reconciliationRecordRepository
                .countByOrgIdAndCycleIdGroupByStatus(actor.getOrg().getId(), cycleId);
        Map<ReconciliationStatus, Long> countByStatus = statusCounts.stream()
                .collect(Collectors.toMap(
                        row -> (ReconciliationStatus) row[0],
                        row -> (Long) row[1]
                ));
        int completedCount = countByStatus.getOrDefault(ReconciliationStatus.COMPLETED, 0L).intValue();

        TransitionContext context = new TransitionContext(
                commitmentCount,
                completedCount,
                commitmentCount,
                Instant.now()
        );

        CycleState targetState = request.targetState();
        TransitionResult result = stateMachine.validate(cycle, targetState, actor, context);

        if (!result.allowed()) {
            throw new ConflictException(result.rejectionReason());
        }

        CycleState fromState = cycle.getState();
        cycle.setState(targetState);

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
            return;
        }

        // Find or create the next week's DRAFT cycle
        Instant nextWeekStart = cycle.getEndsAt().plusSeconds(1)
                .truncatedTo(ChronoUnit.DAYS);
        // Align to next Monday
        String timezone = actor.getOrg().getTimezone() != null ? actor.getOrg().getTimezone() : "UTC";
        Instant nextWeekAlignedStart = computeWeekStart(nextWeekStart, timezone);
        Instant nextWeekEnd = computeWeekEnd(nextWeekAlignedStart);
        String nextLabel = computeLabel(nextWeekAlignedStart, timezone);

        Cycle nextCycle = cycleRepository.findByOrgIdAndIsActiveTrue(actor.getOrg().getId())
                .filter(c -> !c.getId().equals(cycle.getId()))
                .orElseGet(() -> createDraftCycle(actor.getOrg(), nextWeekAlignedStart, nextWeekEnd, nextLabel));

        for (Commitment original : carriedForwardCommitments) {
            Commitment savedClone = commitmentService.cloneForCarryForward(original, nextCycle);
            log.info("completeCycle: carried forward commitment originalId={} cloneId={} userId={} cycleId={}",
                    original.getId(), savedClone.getId(), original.getUser().getId(), nextCycle.getId());
        }
    }

    /**
     * Returns the number of commitments in the given cycle for the actor's org.
     */
    public int getCommitmentCount(UUID orgId, UUID cycleId) {
        return commitmentRepository
                .findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId).size();
    }

    /**
     * List cycle history for the org. Actor must be in the same org.
     * Queries only cycles belonging to the given org, then applies in-memory filters.
     */
    public Page<Cycle> listCycles(UUID orgId, CycleFilters filters, Pageable pageable) {
        List<Cycle> orgCycles = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);

        List<Cycle> filtered = orgCycles.stream()
                .filter(c -> filters.state() == null || c.getState() == filters.state())
                .filter(c -> filters.dateFrom() == null || !c.getStartsAt().isBefore(filters.dateFrom()))
                .filter(c -> filters.dateTo() == null || !c.getStartsAt().isAfter(filters.dateTo()))
                .collect(Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<Cycle> page = start >= filtered.size() ? List.of() : filtered.subList(start, end);

        return new PageImpl<>(page, pageable, filtered.size());
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
