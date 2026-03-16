package com.st6.committracker.domain.reconciliation;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.commit.TaskBulletRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.reconciliation.dto.ReconcileRequest;
import com.st6.committracker.domain.reconciliation.dto.ReconciliationSummary;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.security.VisibilityEnforcer;
import com.st6.committracker.shared.ConflictException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReconciliationServiceTest {

    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private TaskBulletRepository taskBulletRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private AuditService auditService;
    @InjectMocks private ReconciliationService reconciliationService;

    private Org org;
    private AppUser employee;
    private AppUser analyst;
    private AppUser otherEmployee;
    private Cycle reconcilingCycle;
    private Cycle draftCycle;
    private Cycle lockedCycle;
    private Commitment commitment;
    private UUID commitmentId;
    private UUID cycleId;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        employee = new AppUser(org, "emp@example.com", "Employee", UserRole.EMPLOYEE, null);
        employee.setId(UUID.randomUUID());

        analyst = new AppUser(org, "analyst@example.com", "Analyst", UserRole.ANALYST, null);
        analyst.setId(UUID.randomUUID());

        otherEmployee = new AppUser(org, "other@example.com", "Other", UserRole.EMPLOYEE, null);
        otherEmployee.setId(UUID.randomUUID());

        cycleId = UUID.randomUUID();

        reconcilingCycle = Cycle.builder()
                .org(org)
                .label("Week 1")
                .state(CycleState.RECONCILING)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        reconcilingCycle.setId(cycleId);

        draftCycle = Cycle.builder()
                .org(org)
                .label("Week 2")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        draftCycle.setId(UUID.randomUUID());

        lockedCycle = Cycle.builder()
                .org(org)
                .label("Week 3")
                .state(CycleState.LOCKED)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        lockedCycle.setId(UUID.randomUUID());

        commitmentId = UUID.randomUUID();
        commitment = Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(reconcilingCycle)
                .title("Test Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .build();
        commitment.setId(commitmentId);
    }

    // --------------- role guard ---------------

    @Test
    void reconcile_asAnalyst_throwsForbidden() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        assertThatThrownBy(() -> reconciliationService.reconcileCommitment(commitmentId, request, analyst))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).findById(any());
    }

    // --------------- cycle state checks ---------------

    @Test
    void reconcile_inReconcilingCycle_createsRecord() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.empty());
        when(reconciliationRecordRepository.save(any(ReconciliationRecord.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReconciliationRecord result = reconciliationService.reconcileCommitment(commitmentId, request, employee);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ReconciliationStatus.COMPLETED);
        verify(reconciliationRecordRepository).save(any(ReconciliationRecord.class));
    }

    @Test
    void reconcile_inDraftCycle_throwsConflict() {
        Commitment draftCommitment = Commitment.builder()
                .org(org).user(employee).cycle(draftCycle)
                .title("Draft").completionHorizon(CompletionHorizon.EOW).build();
        draftCommitment.setId(commitmentId);

        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(draftCommitment));

        assertThatThrownBy(() -> reconciliationService.reconcileCommitment(commitmentId, request, employee))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("RECONCILING");
    }

    @Test
    void reconcile_inLockedCycle_throwsConflict() {
        Commitment lockedCommitment = Commitment.builder()
                .org(org).user(employee).cycle(lockedCycle)
                .title("Locked").completionHorizon(CompletionHorizon.EOW).build();
        lockedCommitment.setId(commitmentId);

        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(lockedCommitment));

        assertThatThrownBy(() -> reconciliationService.reconcileCommitment(commitmentId, request, employee))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("RECONCILING");
    }

    @Test
    void reconcile_byNonOwner_throwsForbidden() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));

        assertThatThrownBy(() -> reconciliationService.reconcileCommitment(commitmentId, request, otherEmployee))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --------------- bullet status updates ---------------

    @Test
    void reconcile_updatesBulletCompletionStatuses() {
        UUID bullet1Id = UUID.randomUUID();
        UUID bullet2Id = UUID.randomUUID();

        TaskBullet bullet1 = TaskBullet.builder()
                .commitment(commitment).org(org).body("Task 1").sortOrder(0).isCompleted(false).build();
        bullet1.setId(bullet1Id);

        TaskBullet bullet2 = TaskBullet.builder()
                .commitment(commitment).org(org).body("Task 2").sortOrder(1).isCompleted(false).build();
        bullet2.setId(bullet2Id);

        List<ReconcileRequest.BulletStatusUpdate> bulletStatuses = List.of(
                new ReconcileRequest.BulletStatusUpdate(bullet1Id, true),
                new ReconcileRequest.BulletStatusUpdate(bullet2Id, false)
        );
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, bulletStatuses);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.empty());
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitmentId))
                .thenReturn(List.of(bullet1, bullet2));
        when(reconciliationRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        reconciliationService.reconcileCommitment(commitmentId, request, employee);

        assertThat(bullet1.isCompleted()).isTrue();
        assertThat(bullet2.isCompleted()).isFalse();
        verify(taskBulletRepository, times(2)).save(any(TaskBullet.class));
    }

    // --------------- carry forward ---------------

    @Test
    void reconcile_withCarryForward_setsCorrectStatus() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.PARTIALLY_COMPLETED, "some notes", true, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.empty());
        when(reconciliationRecordRepository.save(any(ReconciliationRecord.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReconciliationRecord result = reconciliationService.reconcileCommitment(commitmentId, request, employee);

        assertThat(result.getStatus()).isEqualTo(ReconciliationStatus.CARRIED_FORWARD);
    }

    // --------------- idempotent update ---------------

    @Test
    void reconcile_existingRecord_updatesInsteadOfDuplicate() {
        ReconciliationRecord existing = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.PARTIALLY_COMPLETED)
                .notes("old notes")
                .reconciledAt(Instant.now().minusSeconds(3600))
                .reconciledBy(employee)
                .build();
        existing.setId(UUID.randomUUID());

        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.of(existing));
        when(reconciliationRecordRepository.save(any(ReconciliationRecord.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ReconciliationRecord result = reconciliationService.reconcileCommitment(commitmentId, request, employee);

        // Should update the existing record, not create a new one
        assertThat(result).isSameAs(existing);
        assertThat(result.getStatus()).isEqualTo(ReconciliationStatus.COMPLETED);
        verify(reconciliationRecordRepository, times(1)).save(existing);
    }

    // --------------- notes validation ---------------

    @Test
    void reconcile_notCompleted_withoutNotes_throwsValidation() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.PARTIALLY_COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));

        assertThatThrownBy(() -> reconciliationService.reconcileCommitment(commitmentId, request, employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Notes required when status is not COMPLETED");
    }

    @Test
    void reconcile_completed_withoutNotes_succeeds() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.empty());
        when(reconciliationRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Should not throw
        ReconciliationRecord result = reconciliationService.reconcileCommitment(commitmentId, request, employee);
        assertThat(result).isNotNull();
    }

    // --------------- audit ---------------

    @Test
    void reconcile_auditsAction() {
        ReconcileRequest request = new ReconcileRequest(
                ReconciliationStatus.COMPLETED, null, false, List.of());

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(reconciliationRecordRepository.findByCommitmentIdAndCycleId(commitmentId, cycleId))
                .thenReturn(Optional.empty());
        when(reconciliationRecordRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        reconciliationService.reconcileCommitment(commitmentId, request, employee);

        verify(auditService).log(
                any(UUID.class),
                any(String.class),
                any(UUID.class),
                any(String.class),
                any(AppUser.class),
                any()
        );
    }

    // --------------- getReconciliationView ---------------

    @Test
    void getReconciliationView_returnsCommitmentsWithRecords() {
        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(employee)
                .build();
        record.setId(UUID.randomUUID());

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment));
        when(visibilityEnforcer.filterVisible(employee, List.of(commitment)))
                .thenReturn(List.of(commitment));
        when(taskBulletRepository.findByCommitmentIdIn(any(Collection.class)))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(record));

        ReconciliationService.ReconciliationView view =
                reconciliationService.getReconciliationView(cycleId, employee);

        assertThat(view).isNotNull();
        assertThat(view.cycle()).isEqualTo(reconcilingCycle);
        assertThat(view.commitments()).hasSize(1);
        assertThat(view.commitments().get(0).reconciliationRecord()).isEqualTo(record);
    }

    @Test
    void getReconciliationView_notVisible_throwsForbidden() {
        Org otherOrg = Org.builder().id(UUID.randomUUID()).name("Other").slug("other").build();
        Cycle otherCycle = Cycle.builder()
                .org(otherOrg).label("Other Cycle").state(CycleState.RECONCILING)
                .startsAt(Instant.now()).endsAt(Instant.now().plusSeconds(604800)).build();
        otherCycle.setId(UUID.randomUUID());

        when(cycleRepository.findById(otherCycle.getId())).thenReturn(Optional.of(otherCycle));

        assertThatThrownBy(() ->
                reconciliationService.getReconciliationView(otherCycle.getId(), employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void getReconciliationView_mixedReconciled_showsPartialProgress() {
        Commitment commitment2 = Commitment.builder()
                .org(org).user(employee).cycle(reconcilingCycle)
                .title("Second").completionHorizon(CompletionHorizon.EOW).build();
        UUID commitment2Id = UUID.randomUUID();
        commitment2.setId(commitment2Id);

        // Only commitment has a reconciliation record, commitment2 does not
        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(employee)
                .build();
        record.setId(UUID.randomUUID());

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment, commitment2));
        when(visibilityEnforcer.filterVisible(employee, List.of(commitment, commitment2)))
                .thenReturn(List.of(commitment, commitment2));
        when(taskBulletRepository.findByCommitmentIdIn(any(Collection.class)))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(record));

        ReconciliationService.ReconciliationView view =
                reconciliationService.getReconciliationView(cycleId, employee);

        assertThat(view.commitments()).hasSize(2);
        // First commitment has a record
        assertThat(view.commitments().get(0).reconciliationRecord()).isEqualTo(record);
        // Second commitment does not
        assertThat(view.commitments().get(1).reconciliationRecord()).isNull();
    }

    // --------------- isFullyReconciled ---------------

    @Test
    void isFullyReconciled_allReconciled_returnsTrue() {
        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(employee)
                .build();

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(record));

        assertThat(reconciliationService.isFullyReconciled(cycleId)).isTrue();
    }

    @Test
    void isFullyReconciled_someUnreconciled_returnsFalse() {
        Commitment commitment2 = Commitment.builder()
                .org(org).user(employee).cycle(reconcilingCycle)
                .title("Second").completionHorizon(CompletionHorizon.EOW).build();
        commitment2.setId(UUID.randomUUID());

        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(employee)
                .build();

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment, commitment2));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(record));

        assertThat(reconciliationService.isFullyReconciled(cycleId)).isFalse();
    }

    @Test
    void isFullyReconciled_emptyCommitments_returnsTrue() {
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of());

        assertThat(reconciliationService.isFullyReconciled(cycleId)).isTrue();
    }

    // --------------- computeSummary ---------------

    @Test
    void computeSummary_calculatesCorrectCounts() {
        Commitment c2 = Commitment.builder().org(org).user(employee).cycle(reconcilingCycle)
                .title("C2").completionHorizon(CompletionHorizon.EOW).build();
        c2.setId(UUID.randomUUID());
        Commitment c3 = Commitment.builder().org(org).user(employee).cycle(reconcilingCycle)
                .title("C3").completionHorizon(CompletionHorizon.EOW).build();
        c3.setId(UUID.randomUUID());

        ReconciliationRecord r1 = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(employee).build();
        ReconciliationRecord r2 = ReconciliationRecord.builder()
                .org(org).commitment(c2).cycle(reconcilingCycle)
                .status(ReconciliationStatus.PARTIALLY_COMPLETED)
                .notes("some notes")
                .reconciledAt(Instant.now()).reconciledBy(employee).build();
        ReconciliationRecord r3 = ReconciliationRecord.builder()
                .org(org).commitment(c3).cycle(reconcilingCycle)
                .status(ReconciliationStatus.NOT_STARTED)
                .notes("not started")
                .reconciledAt(Instant.now()).reconciledBy(employee).build();

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment, c2, c3));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(r1, r2, r3));
        when(taskBulletRepository.findByCommitmentIdIn(any(Collection.class)))
                .thenReturn(List.of());

        ReconciliationSummary summary = reconciliationService.computeSummary(cycleId);

        assertThat(summary.totalCommitments()).isEqualTo(3);
        assertThat(summary.reconciledCount()).isEqualTo(3);
        assertThat(summary.completedCount()).isEqualTo(1);
        assertThat(summary.partiallyCompletedCount()).isEqualTo(1);
        assertThat(summary.notStartedCount()).isEqualTo(1);
        assertThat(summary.carriedForwardCount()).isEqualTo(0);
        assertThat(summary.completionRate()).isCloseTo(1.0 / 3.0, within(0.001));
    }

    @Test
    void computeSummary_calculatesBulletCompletionRate() {
        TaskBullet completedBullet = TaskBullet.builder()
                .commitment(commitment).org(org).body("Done").sortOrder(0).isCompleted(true).build();
        TaskBullet pendingBullet = TaskBullet.builder()
                .commitment(commitment).org(org).body("Pending").sortOrder(1).isCompleted(false).build();

        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(reconcilingCycle)
                .status(ReconciliationStatus.PARTIALLY_COMPLETED)
                .notes("partial")
                .reconciledAt(Instant.now()).reconciledBy(employee).build();

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(reconcilingCycle));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(commitment));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(org.getId(), cycleId))
                .thenReturn(List.of(record));
        when(taskBulletRepository.findByCommitmentIdIn(any(Collection.class)))
                .thenReturn(List.of(completedBullet, pendingBullet));

        ReconciliationSummary summary = reconciliationService.computeSummary(cycleId);

        assertThat(summary.bulletCompletionRate()).isCloseTo(0.5, within(0.001));
    }
}
