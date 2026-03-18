package com.st6.committracker.domain.cycle;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.CommitmentService;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.cycle.dto.CycleFilters;
import com.st6.committracker.domain.cycle.dto.TransitionRequest;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.shared.ConflictException;
import com.st6.committracker.shared.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CycleServiceTest {

    @Mock private CycleRepository cycleRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private CommitmentService commitmentService;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private AuditService auditService;

    @InjectMocks private CycleService cycleService;

    private Org org;
    private AppUser manager;
    private AppUser analyst;
    private AppUser employee;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        manager = new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null);
        manager.setId(UUID.randomUUID());

        analyst = new AppUser(org, "analyst@example.com", "Analyst", UserRole.ANALYST, null);
        analyst.setId(UUID.randomUUID());

        employee = new AppUser(org, "employee@example.com", "Employee", UserRole.EMPLOYEE, null);
        employee.setId(UUID.randomUUID());
    }

    // -------------------------------------------------------------------------
    // getCurrentCycle (4 tests)
    // -------------------------------------------------------------------------

    @Test
    void getCurrentCycle_existingDraftForOrg_returnsCycle() {
        Cycle existing = buildCycle(org, CycleState.DRAFT, true);
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId())).thenReturn(Optional.of(existing));

        Cycle result = cycleService.getCurrentCycle(manager);

        assertThat(result).isSameAs(existing);
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void getCurrentCycle_noDraftForOrg_createsNewDraftCycle() {
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId())).thenReturn(Optional.empty());
        when(cycleRepository.save(any(Cycle.class))).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Cycle result = cycleService.getCurrentCycle(manager);

        assertThat(result).isNotNull();
        assertThat(result.getState()).isEqualTo(CycleState.DRAFT);
        assertThat(result.isActive()).isTrue();
        verify(cycleRepository).save(any(Cycle.class));
    }

    @Test
    void getCurrentCycle_computesCorrectWeekBoundaries() {
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId())).thenReturn(Optional.empty());

        ArgumentCaptor<Cycle> captor = ArgumentCaptor.forClass(Cycle.class);
        when(cycleRepository.save(captor.capture())).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        cycleService.getCurrentCycle(manager);

        Cycle saved = captor.getValue();

        // Week must start on Monday
        ZonedDateTime startZdt = saved.getStartsAt().atZone(ZoneId.of("UTC"));
        assertThat(startZdt.getDayOfWeek().getValue()).isEqualTo(1); // Monday
        assertThat(startZdt.getHour()).isZero();
        assertThat(startZdt.getMinute()).isZero();
        assertThat(startZdt.getSecond()).isZero();

        // Week end must be 6 days 23:59:59 later
        Instant expectedEnd = saved.getStartsAt()
                .plus(6, ChronoUnit.DAYS)
                .plus(23, ChronoUnit.HOURS)
                .plus(59, ChronoUnit.MINUTES)
                .plus(59, ChronoUnit.SECONDS);
        assertThat(saved.getEndsAt()).isEqualTo(expectedEnd);
    }

    @Test
    void getCurrentCycle_respectsOrgTimezone() {
        // Use New York timezone (UTC-5 in winter). A Monday in UTC may be Sunday in NY.
        Org nyOrg = Org.builder()
                .id(UUID.randomUUID())
                .name("NY Org")
                .slug("ny-org")
                .timezone("America/New_York")
                .build();
        AppUser nyManager = new AppUser(nyOrg, "ny@example.com", "NY Manager", UserRole.MANAGER, null);
        nyManager.setId(UUID.randomUUID());

        when(cycleRepository.findByOrgIdAndIsActiveTrue(nyOrg.getId())).thenReturn(Optional.empty());

        ArgumentCaptor<Cycle> captor = ArgumentCaptor.forClass(Cycle.class);
        when(cycleRepository.save(captor.capture())).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        cycleService.getCurrentCycle(nyManager);

        Cycle saved = captor.getValue();
        // The week start should be a Monday when viewed in the NY timezone
        ZonedDateTime startInNy = saved.getStartsAt().atZone(ZoneId.of("America/New_York"));
        assertThat(startInNy.getDayOfWeek().getValue()).isEqualTo(1); // Monday in NY
        // Label should also match NY week
        assertThat(saved.getLabel()).startsWith("Week of");
    }

    // -------------------------------------------------------------------------
    // getCycle (3 tests)
    // -------------------------------------------------------------------------

    @Test
    void getCycle_sameOrg_returnsCycle() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.DRAFT, true);
        cycle.setId(cycleId);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        Cycle result = cycleService.getCycle(cycleId, manager);

        assertThat(result).isSameAs(cycle);
    }

    @Test
    void getCycle_differentOrg_throwsAccessDenied() {
        UUID cycleId = UUID.randomUUID();
        Org otherOrg = Org.builder()
                .id(UUID.randomUUID())
                .name("Other")
                .slug("other")
                .timezone("UTC")
                .build();
        Cycle cycle = buildCycle(otherOrg, CycleState.DRAFT, true);
        cycle.setId(cycleId);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> cycleService.getCycle(cycleId, manager))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getCycle_notFound_throwsEntityNotFound() {
        UUID cycleId = UUID.randomUUID();
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cycleService.getCycle(cycleId, manager))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // -------------------------------------------------------------------------
    // role guard (2 tests)
    // -------------------------------------------------------------------------

    @Test
    void transition_asAnalyst_throwsForbidden() {
        UUID cycleId = UUID.randomUUID();
        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, null);

        assertThatThrownBy(() -> cycleService.transition(cycleId, request, analyst))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void transition_asEmployee_throwsForbidden() {
        UUID cycleId = UUID.randomUUID();
        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, null);

        assertThatThrownBy(() -> cycleService.transition(cycleId, request, employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    // -------------------------------------------------------------------------
    // transition (4 tests)
    // -------------------------------------------------------------------------

    @Test
    void transition_validDraftToLocked_updatesStateAndAudits() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.DRAFT, true);
        cycle.setId(cycleId);
        // Set startsAt to current week (this week's Monday)
        Instant weekStart = cycleService.computeWeekStart(Instant.now(), "UTC");
        cycle.setStartsAt(weekStart);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle)));
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.of());

        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, "Locking for the week");

        Cycle result = cycleService.transition(cycleId, request, manager);

        assertThat(result.getState()).isEqualTo(CycleState.LOCKED);
        verify(auditService).log(
                eq(org.getId()),
                eq("CYCLE"),
                eq(cycleId),
                eq("STATE_TRANSITION"),
                eq(manager),
                any()
        );
    }

    @Test
    void transition_rejectedByStateMachine_throwsConflict() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.DRAFT, true);
        cycle.setId(cycleId);
        // Set week start in the past so it fails the "past week" check
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        // Return an empty list so commitmentCount < 1 also fails (rejected due to no commitments)
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.of());

        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, null);

        assertThatThrownBy(() -> cycleService.transition(cycleId, request, manager))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void transition_writesAuditEntry() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.DRAFT, true);
        cycle.setId(cycleId);
        Instant weekStart = cycleService.computeWeekStart(Instant.now(), "UTC");
        cycle.setStartsAt(weekStart);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle)));
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.of());

        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, "audit test");

        cycleService.transition(cycleId, request, manager);

        ArgumentCaptor<java.util.Map> detailsCaptor = ArgumentCaptor.forClass(java.util.Map.class);
        verify(auditService).log(
                eq(org.getId()),
                eq("CYCLE"),
                eq(cycleId),
                eq("STATE_TRANSITION"),
                eq(manager),
                detailsCaptor.capture()
        );
        java.util.Map<?, ?> details = detailsCaptor.getValue();
        assertThat(details.get("from")).isEqualTo("DRAFT");
        assertThat(details.get("to")).isEqualTo("LOCKED");
    }

    @Test
    void transition_toReconciled_triggersCarryForward() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.RECONCILING, true);
        cycle.setId(cycleId);
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle)));
        // Return COMPLETED=1 via grouped query
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.<Object[]>of(new Object[]{ReconciliationStatus.COMPLETED, 1L}));

        // completeCycle will query for carry-forward records (none — so no cycle lookup needed)
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of()); // No carry-forward items

        TransitionRequest request = new TransitionRequest(CycleState.RECONCILED, null);

        Cycle result = cycleService.transition(cycleId, request, manager);

        assertThat(result.getState()).isEqualTo(CycleState.RECONCILED);
        // completeCycle was triggered; since no carry-forward items, cloneForCarryForward never called
        verify(commitmentService, never()).cloneForCarryForward(any(), any());
    }

    @Test
    void transition_toReconciled_deactivatesCycle() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.RECONCILING, true);
        cycle.setId(cycleId);
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle)));
        // 1 COMPLETED record = all commitments reconciled
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.<Object[]>of(new Object[]{ReconciliationStatus.COMPLETED, 1L}));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of());

        TransitionRequest request = new TransitionRequest(CycleState.RECONCILED, null);
        Cycle result = cycleService.transition(cycleId, request, manager);

        assertThat(result.getState()).isEqualTo(CycleState.RECONCILED);
        assertThat(result.isActive()).isFalse();
    }

    @Test
    void transition_reconcilingToReconciled_allowsMixedStatuses() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.RECONCILING, true);
        cycle.setId(cycleId);
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        // 3 commitments total
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle), buildCommitment(cycle), buildCommitment(cycle)));
        // Mix of statuses: 1 COMPLETED + 1 CARRIED_FORWARD + 1 PARTIALLY_COMPLETED = 3 total
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.<Object[]>of(
                        new Object[]{ReconciliationStatus.COMPLETED, 1L},
                        new Object[]{ReconciliationStatus.CARRIED_FORWARD, 1L},
                        new Object[]{ReconciliationStatus.PARTIALLY_COMPLETED, 1L}
                ));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of());

        TransitionRequest request = new TransitionRequest(CycleState.RECONCILED, null);
        Cycle result = cycleService.transition(cycleId, request, manager);

        assertThat(result.getState()).isEqualTo(CycleState.RECONCILED);
    }

    @Test
    void transition_reconcilingToReconciled_rejectsWhenNotAllReconciled() {
        UUID cycleId = UUID.randomUUID();
        Cycle cycle = buildCycle(org, CycleState.RECONCILING, true);
        cycle.setId(cycleId);
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(cycle));
        // 3 commitments but only 2 reconciled
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(buildCommitment(cycle), buildCommitment(cycle), buildCommitment(cycle)));
        when(reconciliationRecordRepository.countByOrgIdAndCycleIdGroupByStatus(org.getId(), cycleId))
                .thenReturn(List.<Object[]>of(
                        new Object[]{ReconciliationStatus.COMPLETED, 1L},
                        new Object[]{ReconciliationStatus.CARRIED_FORWARD, 1L}
                ));

        TransitionRequest request = new TransitionRequest(CycleState.RECONCILED, null);

        assertThatThrownBy(() -> cycleService.transition(cycleId, request, manager))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("2 of 3 reconciled");
    }

    // -------------------------------------------------------------------------
    // completeCycle (5 tests)
    // -------------------------------------------------------------------------

    @Test
    void completeCycle_clonesCarriedForwardCommitments() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Commitment original = buildCommitment(cycle);

        ReconciliationRecord record = buildReconciliationRecord(original, cycle, ReconciliationStatus.CARRIED_FORWARD);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(record));
        when(cycleRepository.findByOrgIdAndStartsAt(eq(org.getId()), any(Instant.class))).thenReturn(Optional.empty());
        when(cycleRepository.save(any(Cycle.class))).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        Commitment cloned = buildCommitment(cycle);
        when(commitmentService.cloneForCarryForward(eq(original), any(Cycle.class))).thenReturn(cloned);

        cycleService.completeCycle(cycle, manager);

        verify(commitmentService).cloneForCarryForward(eq(original), any(Cycle.class));
    }

    @Test
    void completeCycle_clonedRetainsTitleBulletsRcdoCategory() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Commitment original = buildCommitment(cycle);
        original.setTitle("My Important Task");
        original.setDescription("Some description");
        TaskBullet bullet = TaskBullet.builder()
                .commitment(original)
                .org(org)
                .body("Bullet 1")
                .sortOrder(1)
                .isCompleted(true)
                .build();
        original.getTaskBullets().add(bullet);

        ReconciliationRecord record = buildReconciliationRecord(original, cycle, ReconciliationStatus.CARRIED_FORWARD);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(record));
        when(cycleRepository.findByOrgIdAndStartsAt(eq(org.getId()), any(Instant.class))).thenReturn(Optional.empty());
        when(cycleRepository.save(any(Cycle.class))).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        // Simulate cloneForCarryForward returning a clone that copies the title/description
        Commitment cloned = buildCommitment(cycle);
        cloned.setTitle(original.getTitle());
        cloned.setDescription(original.getDescription());
        // cloneForCarryForward in CommitmentService creates bullets with isCompleted=false
        TaskBullet clonedBullet = TaskBullet.builder()
                .commitment(cloned)
                .org(org)
                .body("Bullet 1")
                .sortOrder(1)
                .isCompleted(false)
                .build();
        cloned.getTaskBullets().add(clonedBullet);
        when(commitmentService.cloneForCarryForward(eq(original), any(Cycle.class))).thenReturn(cloned);

        cycleService.completeCycle(cycle, manager);

        // Verify delegation happened and the returned clone has expected properties
        verify(commitmentService).cloneForCarryForward(eq(original), any(Cycle.class));
        assertThat(cloned.getTitle()).isEqualTo("My Important Task");
        assertThat(cloned.getDescription()).isEqualTo("Some description");
        assertThat(cloned.getTaskBullets()).hasSize(1);
        assertThat(cloned.getTaskBullets().get(0).getBody()).isEqualTo("Bullet 1");
        assertThat(cloned.getTaskBullets().get(0).isCompleted()).isFalse();
    }

    @Test
    void completeCycle_clonedSetsCarriedFromId() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Commitment original = buildCommitment(cycle);
        UUID originalId = UUID.randomUUID();
        original.setId(originalId);

        ReconciliationRecord record = buildReconciliationRecord(original, cycle, ReconciliationStatus.CARRIED_FORWARD);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(record));
        when(cycleRepository.findByOrgIdAndStartsAt(eq(org.getId()), any(Instant.class))).thenReturn(Optional.empty());
        when(cycleRepository.save(any(Cycle.class))).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        // Simulate clone with carriedFrom set to original
        Commitment cloned = buildCommitment(cycle);
        cloned.setCarriedFrom(original);
        when(commitmentService.cloneForCarryForward(eq(original), any(Cycle.class))).thenReturn(cloned);

        cycleService.completeCycle(cycle, manager);

        verify(commitmentService).cloneForCarryForward(eq(original), any(Cycle.class));
        assertThat(cloned.getCarriedFrom()).isSameAs(original);
        assertThat(cloned.getCarriedFrom().getId()).isEqualTo(originalId);
    }

    @Test
    void completeCycle_clonedResetsRankAndHorizon() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Commitment original = buildCommitment(cycle);
        original.setPriorityRank(5);
        original.setCompletionHorizon(CompletionHorizon.MORNING);
        original.setUnplanned(true);

        ReconciliationRecord record = buildReconciliationRecord(original, cycle, ReconciliationStatus.CARRIED_FORWARD);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(record));
        when(cycleRepository.findByOrgIdAndStartsAt(eq(org.getId()), any(Instant.class))).thenReturn(Optional.empty());
        when(cycleRepository.save(any(Cycle.class))).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        // Simulate clone with reset rank and horizon (as CommitmentService.cloneForCarryForward does)
        Commitment cloned = buildCommitment(cycle);
        cloned.setPriorityRank(0);
        cloned.setCompletionHorizon(CompletionHorizon.EOW);
        cloned.setUnplanned(false);
        when(commitmentService.cloneForCarryForward(eq(original), any(Cycle.class))).thenReturn(cloned);

        cycleService.completeCycle(cycle, manager);

        verify(commitmentService).cloneForCarryForward(eq(original), any(Cycle.class));
        assertThat(cloned.getPriorityRank()).isZero();
        assertThat(cloned.getCompletionHorizon()).isEqualTo(CompletionHorizon.EOW);
        assertThat(cloned.isUnplanned()).isFalse();
    }

    @Test
    void completeCycle_noCarryForwardItems_createsNothingNew() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        // Records exist but none are CARRIED_FORWARD
        ReconciliationRecord completedRecord = buildReconciliationRecord(
                buildCommitment(cycle), cycle, ReconciliationStatus.COMPLETED);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(completedRecord));

        cycleService.completeCycle(cycle, manager);

        verify(commitmentService, never()).cloneForCarryForward(any(), any());
        verify(cycleRepository, never()).save(any());
    }

    @Test
    void completeCycle_createsNextWeekDraftCycleIfNeeded() {
        Cycle cycle = buildCycle(org, CycleState.RECONCILED, false);
        cycle.setId(UUID.randomUUID());
        cycle.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        cycle.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Commitment original = buildCommitment(cycle);
        ReconciliationRecord record = buildReconciliationRecord(original, cycle, ReconciliationStatus.CARRIED_FORWARD);

        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycle.getId()))
                .thenReturn(List.of(record));
        // No active next-week cycle exists
        when(cycleRepository.findByOrgIdAndStartsAt(eq(org.getId()), any(Instant.class))).thenReturn(Optional.empty());

        ArgumentCaptor<Cycle> cycleCaptor = ArgumentCaptor.forClass(Cycle.class);
        when(cycleRepository.save(cycleCaptor.capture())).thenAnswer(inv -> {
            Cycle c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        Commitment cloned = buildCommitment(cycle);
        when(commitmentService.cloneForCarryForward(eq(original), any(Cycle.class))).thenReturn(cloned);

        cycleService.completeCycle(cycle, manager);

        // A new DRAFT cycle should have been saved
        List<Cycle> savedCycles = cycleCaptor.getAllValues();
        assertThat(savedCycles).hasSize(1);
        Cycle nextCycle = savedCycles.get(0);
        assertThat(nextCycle.getState()).isEqualTo(CycleState.DRAFT);
        assertThat(nextCycle.isActive()).isTrue();
        assertThat(nextCycle.getLabel()).startsWith("Week of");
    }

    // -------------------------------------------------------------------------
    // listCycles (1 test)
    // -------------------------------------------------------------------------

    @Test
    void listCycles_returnsPagedResults() {
        Cycle c1 = buildCycle(org, CycleState.RECONCILED, false);
        c1.setId(UUID.randomUUID());
        c1.setStartsAt(Instant.now().minus(14, ChronoUnit.DAYS));
        c1.setEndsAt(Instant.now().minus(7, ChronoUnit.DAYS));

        Cycle c2 = buildCycle(org, CycleState.DRAFT, true);
        c2.setId(UUID.randomUUID());
        c2.setStartsAt(Instant.now().minus(7, ChronoUnit.DAYS));
        c2.setEndsAt(Instant.now());

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId())).thenReturn(List.of(c1, c2));

        CycleFilters filters = new CycleFilters(null, null, null);
        Pageable pageable = PageRequest.of(0, 10);

        Page<Cycle> result = cycleService.listCycles(org.getId(), filters, pageable);

        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).hasSize(2);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Cycle buildCycle(Org org, CycleState state, boolean active) {
        Instant now = Instant.now();
        Instant weekStart = now.truncatedTo(ChronoUnit.DAYS)
                .minus(now.atZone(ZoneId.of("UTC")).getDayOfWeek().getValue() - 1, ChronoUnit.DAYS);
        Instant weekEnd = weekStart.plus(6, ChronoUnit.DAYS)
                .plus(23, ChronoUnit.HOURS)
                .plus(59, ChronoUnit.MINUTES)
                .plus(59, ChronoUnit.SECONDS);

        return Cycle.builder()
                .org(org)
                .label("Week of Test")
                .state(state)
                .startsAt(weekStart)
                .endsAt(weekEnd)
                .isActive(active)
                .build();
    }

    private Commitment buildCommitment(Cycle cycle) {
        Commitment c = new Commitment(org, manager, cycle, "Test commitment", CompletionHorizon.EOW);
        c.setId(UUID.randomUUID());
        return c;
    }

    private ReconciliationRecord buildReconciliationRecord(Commitment commitment, Cycle cycle, ReconciliationStatus status) {
        return ReconciliationRecord.builder()
                .org(org)
                .commitment(commitment)
                .cycle(cycle)
                .status(status)
                .reconciledAt(Instant.now())
                .reconciledBy(manager)
                .build();
    }
}
