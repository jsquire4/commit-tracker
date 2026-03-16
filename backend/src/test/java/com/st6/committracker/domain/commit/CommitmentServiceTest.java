package com.st6.committracker.domain.commit;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.dto.CommitmentFilters;
import com.st6.committracker.domain.commit.dto.CreateCommitmentRequest;
import com.st6.committracker.domain.commit.dto.CreateUnplannedCommitmentRequest;
import com.st6.committracker.domain.commit.dto.UpdateCommitmentRequest;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
import com.st6.committracker.domain.rcdo.Outcome;
import com.st6.committracker.domain.rcdo.OutcomeRepository;
import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.security.VisibilityEnforcer;
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
class CommitmentServiceTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private TaskBulletRepository taskBulletRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private AuditService auditService;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @InjectMocks private CommitmentService commitmentService;

    private Org org;
    private AppUser employee;
    private AppUser analyst;
    private AppUser manager;
    private Cycle draftCycle;
    private Cycle lockedCycle;
    private Cycle reconcilingCycle;

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

        manager = new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null);
        manager.setId(UUID.randomUUID());

        draftCycle = Cycle.builder()
                .org(org)
                .label("Week of Jan 1")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .isActive(true)
                .build();
        draftCycle.setId(UUID.randomUUID());

        lockedCycle = Cycle.builder()
                .org(org)
                .label("Week of Jan 8")
                .state(CycleState.LOCKED)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .isActive(false)
                .build();
        lockedCycle.setId(UUID.randomUUID());

        reconcilingCycle = Cycle.builder()
                .org(org)
                .label("Week of Jan 15")
                .state(CycleState.RECONCILING)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .isActive(false)
                .build();
        reconcilingCycle.setId(UUID.randomUUID());
    }

    // -------------------------------------------------------------------------
    // Role guards (4 tests)
    // -------------------------------------------------------------------------

    @Test
    void create_asAnalyst_throwsForbidden() {
        CreateCommitmentRequest request = buildCreateRequest(draftCycle.getId(), List.of("bullet1", "bullet2"));

        assertThatThrownBy(() -> commitmentService.create(request, analyst))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void update_asAnalyst_throwsForbidden() {
        UUID commitmentId = UUID.randomUUID();
        UpdateCommitmentRequest request = buildUpdateRequest(List.of("bullet1", "bullet2"));

        assertThatThrownBy(() -> commitmentService.update(commitmentId, request, analyst))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void delete_asAnalyst_throwsForbidden() {
        UUID commitmentId = UUID.randomUUID();

        assertThatThrownBy(() -> commitmentService.delete(commitmentId, analyst))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).delete(any());
    }

    @Test
    void reorder_asAnalyst_throwsForbidden() {
        UUID cycleId = UUID.randomUUID();
        List<UUID> ids = List.of(UUID.randomUUID(), UUID.randomUUID());

        assertThatThrownBy(() -> commitmentService.reorder(cycleId, ids, analyst))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // create (10 tests)
    // -------------------------------------------------------------------------

    @Test
    void create_inDraftCycle_persistsCommitmentAndBullets() {
        ChessCategory category = buildActiveCategory();
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(employee.getId(), draftCycle.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "My commitment",
                "Description",
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null, null,
                List.of("bullet 1", "bullet 2")
        );

        Commitment result = commitmentService.create(request, employee);

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("My commitment");
        assertThat(result.isUnplanned()).isFalse();
        verify(commitmentRepository).save(any(Commitment.class));
        verify(taskBulletRepository, times(2)).save(any(TaskBullet.class));
        verify(auditService).log(eq(org.getId()), eq("Commitment"), any(), eq("COMMITMENT_CREATED"), eq(employee), any());
    }

    @Test
    void create_inLockedCycle_throwsConflict() {
        when(cycleRepository.findById(lockedCycle.getId())).thenReturn(Optional.of(lockedCycle));

        CreateCommitmentRequest request = buildCreateRequest(lockedCycle.getId(), List.of("b1", "b2"));

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(ConflictException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_withInvalidRcdoHierarchy_throwsValidation() {
        UUID outcomeId = UUID.randomUUID();
        // outcomeId set but no definingObjectiveId
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                null,
                null,
                null, // missing definingObjectiveId
                outcomeId,
                null,
                List.of("b1", "b2")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("definingObjectiveId is required");

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_withArchivedRcdo_throwsValidation() {
        UUID rallyCryId = UUID.randomUUID();
        RallyCry archivedRc = buildArchivedRallyCry(rallyCryId);

        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(rallyCryRepository.findById(rallyCryId)).thenReturn(Optional.of(archivedRc));

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                null,
                rallyCryId,
                null, null, null,
                List.of("b1", "b2")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("archived");

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_withInvalidChessCategory_throwsValidation() {
        UUID inactiveCatId = UUID.randomUUID();
        ChessCategory inactiveCategory = ChessCategory.builder()
                .org(org)
                .name("Inactive")
                .isActive(false)
                .build();
        inactiveCategory.setId(inactiveCatId);

        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(chessCategoryRepository.findById(inactiveCatId)).thenReturn(Optional.of(inactiveCategory));

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                inactiveCatId,
                null, null, null, null,
                List.of("b1", "b2")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not active");

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_setsAutoIncrementedRank() {
        ChessCategory category = buildActiveCategory();
        Commitment existing = buildCommitment(employee, draftCycle, 3);

        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(employee.getId(), draftCycle.getId()))
                .thenReturn(List.of(existing));

        ArgumentCaptor<Commitment> captor = ArgumentCaptor.forClass(Commitment.class);
        when(commitmentRepository.save(captor.capture())).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "New commitment",
                null,
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null, null,
                List.of("b1", "b2")
        );

        commitmentService.create(request, employee);

        Commitment saved = captor.getValue();
        assertThat(saved.getPriorityRank()).isEqualTo(4); // max(3) + 1
    }

    @Test
    void create_withAssignedBy_validatesUserExists() {
        UUID assignedById = UUID.randomUUID();
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(userRepository.findById(assignedById)).thenReturn(Optional.empty());

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                null,
                null, null, null,
                assignedById,
                List.of("b1", "b2")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(EntityNotFoundException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_withFewerThan2Bullets_throwsValidation() {
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                null, null, null, null, null,
                List.of("only one bullet")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(IllegalArgumentException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_withMoreThan5Bullets_throwsValidation() {
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "title",
                null,
                CompletionHorizon.EOD,
                null, null, null, null, null,
                List.of("b1", "b2", "b3", "b4", "b5", "b6")
        );

        assertThatThrownBy(() -> commitmentService.create(request, employee))
                .isInstanceOf(IllegalArgumentException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void create_auditsCreation() {
        ChessCategory category = buildActiveCategory();
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(employee.getId(), draftCycle.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "Audited commitment",
                null,
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null, null,
                List.of("b1", "b2")
        );

        commitmentService.create(request, employee);

        verify(auditService).log(eq(org.getId()), eq("Commitment"), any(), eq("COMMITMENT_CREATED"), eq(employee), any());
    }

    // -------------------------------------------------------------------------
    // update (5 tests)
    // -------------------------------------------------------------------------

    @Test
    void update_inDraftCycle_updatesFieldsAndBullets() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(employee, draftCycle, 0);
        existing.setId(commitmentId);
        ChessCategory category = buildActiveCategory();

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitmentId)).thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenReturn(existing);

        UpdateCommitmentRequest request = new UpdateCommitmentRequest(
                "Updated title",
                "Updated description",
                CompletionHorizon.MIDDAY,
                category.getId(),
                null, null, null, null,
                List.of("new bullet 1", "new bullet 2")
        );

        Commitment result = commitmentService.update(commitmentId, request, employee);

        assertThat(result.getTitle()).isEqualTo("Updated title");
        verify(taskBulletRepository).deleteAll(any());
        verify(taskBulletRepository, times(2)).save(any(TaskBullet.class));
        verify(auditService).log(eq(org.getId()), eq("Commitment"), eq(commitmentId), eq("COMMITMENT_UPDATED"), eq(employee), any());
    }

    @Test
    void update_inLockedCycle_throwsConflict() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(employee, lockedCycle, 0);
        existing.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));

        UpdateCommitmentRequest request = buildUpdateRequest(List.of("b1", "b2"));

        assertThatThrownBy(() -> commitmentService.update(commitmentId, request, employee))
                .isInstanceOf(ConflictException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void update_byNonOwner_throwsForbidden() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(manager, draftCycle, 0); // owned by manager
        existing.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));

        UpdateCommitmentRequest request = buildUpdateRequest(List.of("b1", "b2"));

        assertThatThrownBy(() -> commitmentService.update(commitmentId, request, employee))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void update_notFound_throwsNotFound() {
        UUID commitmentId = UUID.randomUUID();
        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.empty());

        UpdateCommitmentRequest request = buildUpdateRequest(List.of("b1", "b2"));

        assertThatThrownBy(() -> commitmentService.update(commitmentId, request, employee))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void update_auditsWithChangedFields() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(employee, draftCycle, 0);
        existing.setId(commitmentId);
        ChessCategory category = buildActiveCategory();

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitmentId)).thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenReturn(existing);

        UpdateCommitmentRequest request = new UpdateCommitmentRequest(
                "New title",
                "New description",
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null, null,
                List.of("b1", "b2")
        );

        commitmentService.update(commitmentId, request, employee);

        ArgumentCaptor<java.util.Map> detailsCaptor = ArgumentCaptor.forClass(java.util.Map.class);
        verify(auditService).log(eq(org.getId()), eq("Commitment"), eq(commitmentId), eq("COMMITMENT_UPDATED"), eq(employee), detailsCaptor.capture());
        java.util.Map<String, Object> details = detailsCaptor.getValue();
        assertThat(details).containsKey("oldTitle");
        assertThat(details).containsKey("newTitle");
    }

    // -------------------------------------------------------------------------
    // delete (3 tests)
    // -------------------------------------------------------------------------

    @Test
    void delete_inDraftCycle_removesCommitment() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(employee, draftCycle, 0);
        existing.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));

        commitmentService.delete(commitmentId, employee);

        verify(commitmentRepository).delete(existing);
        verify(auditService).log(eq(org.getId()), eq("Commitment"), eq(commitmentId), eq("COMMITMENT_DELETED"), eq(employee), any());
    }

    @Test
    void delete_inLockedCycle_throwsConflict() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(employee, lockedCycle, 0);
        existing.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> commitmentService.delete(commitmentId, employee))
                .isInstanceOf(ConflictException.class);

        verify(commitmentRepository, never()).delete(any(Commitment.class));
    }

    @Test
    void delete_byNonOwner_throwsForbidden() {
        UUID commitmentId = UUID.randomUUID();
        Commitment existing = buildCommitment(manager, draftCycle, 0); // owned by manager
        existing.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> commitmentService.delete(commitmentId, employee))
                .isInstanceOf(AccessDeniedException.class);

        verify(commitmentRepository, never()).delete(any(Commitment.class));
    }

    // -------------------------------------------------------------------------
    // reorder (4 tests)
    // -------------------------------------------------------------------------

    @Test
    void reorder_updatesRanksInOrder() {
        UUID cycleId = draftCycle.getId();
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();
        UUID id3 = UUID.randomUUID();

        Commitment c1 = buildCommitment(employee, draftCycle, 2);
        c1.setId(id1);
        Commitment c2 = buildCommitment(employee, draftCycle, 0);
        c2.setId(id2);
        Commitment c3 = buildCommitment(employee, draftCycle, 1);
        c3.setId(id3);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(draftCycle));
        when(commitmentRepository.findById(id1)).thenReturn(Optional.of(c1));
        when(commitmentRepository.findById(id2)).thenReturn(Optional.of(c2));
        when(commitmentRepository.findById(id3)).thenReturn(Optional.of(c3));
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> inv.getArgument(0));

        commitmentService.reorder(cycleId, List.of(id1, id2, id3), employee);

        assertThat(c1.getPriorityRank()).isEqualTo(0);
        assertThat(c2.getPriorityRank()).isEqualTo(1);
        assertThat(c3.getPriorityRank()).isEqualTo(2);
        verify(commitmentRepository, times(3)).save(any(Commitment.class));
        verify(auditService).log(eq(org.getId()), eq("Commitment"), eq(cycleId), eq("COMMITMENTS_REORDERED"), eq(employee), any());
    }

    @Test
    void reorder_wrongCycle_throwsValidation() {
        UUID targetCycleId = draftCycle.getId();
        UUID otherCycleId = lockedCycle.getId();
        UUID id1 = UUID.randomUUID();

        Commitment c1 = buildCommitment(employee, lockedCycle, 0); // belongs to lockedCycle, not draftCycle
        c1.setId(id1);

        when(cycleRepository.findById(targetCycleId)).thenReturn(Optional.of(draftCycle));
        when(commitmentRepository.findById(id1)).thenReturn(Optional.of(c1));

        assertThatThrownBy(() -> commitmentService.reorder(targetCycleId, List.of(id1), employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cycle");
    }

    @Test
    void reorder_inLockedCycle_throwsConflict() {
        UUID cycleId = lockedCycle.getId();
        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(lockedCycle));

        assertThatThrownBy(() -> commitmentService.reorder(cycleId, List.of(UUID.randomUUID()), employee))
                .isInstanceOf(ConflictException.class);

        verify(commitmentRepository, never()).save(any());
    }

    @Test
    void reorder_byNonOwner_throwsForbidden() {
        UUID cycleId = draftCycle.getId();
        UUID id1 = UUID.randomUUID();

        Commitment c1 = buildCommitment(manager, draftCycle, 0); // owned by manager
        c1.setId(id1);

        when(cycleRepository.findById(cycleId)).thenReturn(Optional.of(draftCycle));
        when(commitmentRepository.findById(id1)).thenReturn(Optional.of(c1));

        assertThatThrownBy(() -> commitmentService.reorder(cycleId, List.of(id1), employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    // -------------------------------------------------------------------------
    // getForCycle (2 tests)
    // -------------------------------------------------------------------------

    @Test
    void getForCycle_filtersAndPaginates() {
        UUID cycleId = draftCycle.getId();
        Commitment c1 = buildCommitment(employee, draftCycle, 0);
        c1.setId(UUID.randomUUID());
        Commitment c2 = buildCommitment(employee, draftCycle, 1);
        c2.setId(UUID.randomUUID());

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(c1, c2));
        when(visibilityEnforcer.filterVisible(eq(employee), any())).thenReturn(List.of(c1, c2));

        CommitmentFilters filters = new CommitmentFilters(null, null, null, null, null, null);
        Pageable pageable = PageRequest.of(0, 10);

        Page<Commitment> result = commitmentService.getForCycle(cycleId, filters, pageable, employee);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    void getForCycle_appliesVisibilityFilter() {
        UUID cycleId = draftCycle.getId();
        Commitment c1 = buildCommitment(employee, draftCycle, 0);
        c1.setId(UUID.randomUUID());
        Commitment c2 = buildCommitment(manager, draftCycle, 0);
        c2.setId(UUID.randomUUID());

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycleId))
                .thenReturn(List.of(c1, c2));
        // Visibility filter hides c2
        when(visibilityEnforcer.filterVisible(eq(employee), any())).thenReturn(List.of(c1));

        CommitmentFilters filters = new CommitmentFilters(null, null, null, null, null, null);
        Pageable pageable = PageRequest.of(0, 10);

        Page<Commitment> result = commitmentService.getForCycle(cycleId, filters, pageable, employee);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent()).containsExactly(c1);
    }

    // -------------------------------------------------------------------------
    // getById (2 tests)
    // -------------------------------------------------------------------------

    @Test
    void getById_visible_returnsCommitment() {
        UUID commitmentId = UUID.randomUUID();
        Commitment commitment = buildCommitment(employee, draftCycle, 0);
        commitment.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(visibilityEnforcer.canViewCommitment(employee, commitment)).thenReturn(true);

        Commitment result = commitmentService.getById(commitmentId, employee);

        assertThat(result).isSameAs(commitment);
    }

    @Test
    void getById_notVisible_throwsForbidden() {
        UUID commitmentId = UUID.randomUUID();
        Commitment commitment = buildCommitment(manager, draftCycle, 0);
        commitment.setId(commitmentId);

        when(commitmentRepository.findById(commitmentId)).thenReturn(Optional.of(commitment));
        when(visibilityEnforcer.canViewCommitment(employee, commitment)).thenReturn(false);

        assertThatThrownBy(() -> commitmentService.getById(commitmentId, employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    // -------------------------------------------------------------------------
    // cloneForCarryForward (4 tests)
    // -------------------------------------------------------------------------

    @Test
    void cloneForCarryForward_copiesFieldsCorrectly() {
        Commitment source = buildCommitment(employee, draftCycle, 2);
        source.setId(UUID.randomUUID());
        source.setTitle("Original title");
        source.setDescription("Original description");
        ChessCategory category = buildActiveCategory();
        source.setChessCategory(category);

        Cycle newCycle = Cycle.builder()
                .org(org)
                .label("Next week")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        newCycle.setId(UUID.randomUUID());

        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(source.getId())).thenReturn(List.of());

        Commitment clone = commitmentService.cloneForCarryForward(source, newCycle);

        assertThat(clone.getTitle()).isEqualTo("Original title");
        assertThat(clone.getDescription()).isEqualTo("Original description");
        assertThat(clone.getChessCategory()).isSameAs(category);
        assertThat(clone.getCycle()).isSameAs(newCycle);
        assertThat(clone.getUser()).isSameAs(employee);
    }

    @Test
    void cloneForCarryForward_setsCarriedFromId() {
        Commitment source = buildCommitment(employee, draftCycle, 0);
        source.setId(UUID.randomUUID());

        Cycle newCycle = Cycle.builder()
                .org(org)
                .label("Next week")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        newCycle.setId(UUID.randomUUID());

        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(source.getId())).thenReturn(List.of());

        Commitment clone = commitmentService.cloneForCarryForward(source, newCycle);

        assertThat(clone.getCarriedFrom()).isSameAs(source);
    }

    @Test
    void cloneForCarryForward_resetsRankAndHorizon() {
        Commitment source = buildCommitment(employee, draftCycle, 5);
        source.setId(UUID.randomUUID());
        source.setCompletionHorizon(CompletionHorizon.AFTERNOON);

        Cycle newCycle = Cycle.builder()
                .org(org)
                .label("Next week")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        newCycle.setId(UUID.randomUUID());

        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(source.getId())).thenReturn(List.of());

        Commitment clone = commitmentService.cloneForCarryForward(source, newCycle);

        assertThat(clone.getPriorityRank()).isEqualTo(0);
        assertThat(clone.isUnplanned()).isFalse();
    }

    @Test
    void cloneForCarryForward_clonesBullets() {
        Commitment source = buildCommitment(employee, draftCycle, 0);
        source.setId(UUID.randomUUID());

        TaskBullet bullet1 = new TaskBullet(source, org, "Do first thing", 0);
        TaskBullet bullet2 = new TaskBullet(source, org, "Do second thing", 1);

        Cycle newCycle = Cycle.builder()
                .org(org)
                .label("Next week")
                .state(CycleState.DRAFT)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .build();
        newCycle.setId(UUID.randomUUID());

        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(source.getId()))
                .thenReturn(List.of(bullet1, bullet2));

        commitmentService.cloneForCarryForward(source, newCycle);

        verify(taskBulletRepository, times(2)).save(any(TaskBullet.class));
    }

    // -------------------------------------------------------------------------
    // createUnplanned (5 tests)
    // -------------------------------------------------------------------------

    @Test
    void createUnplanned_inReconcilingCycle_persistsWithIsUnplannedTrue() {
        ChessCategory category = buildActiveCategory();
        when(cycleRepository.findById(reconcilingCycle.getId())).thenReturn(Optional.of(reconcilingCycle));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(employee.getId(), reconcilingCycle.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        when(reconciliationRecordRepository.save(any(ReconciliationRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateUnplannedCommitmentRequest request = new CreateUnplannedCommitmentRequest(
                reconcilingCycle.getId(),
                "Unplanned work",
                null,
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null,
                List.of("b1", "b2"),
                ReconciliationStatus.COMPLETED,
                null
        );

        Commitment result = commitmentService.createUnplanned(request, employee);

        assertThat(result.isUnplanned()).isTrue();
        verify(reconciliationRecordRepository).save(any(ReconciliationRecord.class));
    }

    @Test
    void createUnplanned_inDraftCycle_throwsConflict() {
        when(cycleRepository.findById(draftCycle.getId())).thenReturn(Optional.of(draftCycle));

        CreateUnplannedCommitmentRequest request = new CreateUnplannedCommitmentRequest(
                draftCycle.getId(),
                "Unplanned",
                null,
                CompletionHorizon.EOD,
                null, null, null, null,
                List.of("b1", "b2"),
                ReconciliationStatus.COMPLETED,
                null
        );

        assertThatThrownBy(() -> commitmentService.createUnplanned(request, employee))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("RECONCILING");
    }

    @Test
    void createUnplanned_inLockedCycle_throwsConflict() {
        when(cycleRepository.findById(lockedCycle.getId())).thenReturn(Optional.of(lockedCycle));

        CreateUnplannedCommitmentRequest request = new CreateUnplannedCommitmentRequest(
                lockedCycle.getId(),
                "Unplanned",
                null,
                CompletionHorizon.EOD,
                null, null, null, null,
                List.of("b1", "b2"),
                ReconciliationStatus.COMPLETED,
                null
        );

        assertThatThrownBy(() -> commitmentService.createUnplanned(request, employee))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void createUnplanned_createsReconciliationRecordAutomatically() {
        ChessCategory category = buildActiveCategory();
        when(cycleRepository.findById(reconcilingCycle.getId())).thenReturn(Optional.of(reconcilingCycle));
        when(chessCategoryRepository.findById(category.getId())).thenReturn(Optional.of(category));
        when(commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(employee.getId(), reconcilingCycle.getId()))
                .thenReturn(List.of());
        when(commitmentRepository.save(any(Commitment.class))).thenAnswer(inv -> {
            Commitment c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });
        ArgumentCaptor<ReconciliationRecord> rrCaptor = ArgumentCaptor.forClass(ReconciliationRecord.class);
        when(reconciliationRecordRepository.save(rrCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        CreateUnplannedCommitmentRequest request = new CreateUnplannedCommitmentRequest(
                reconcilingCycle.getId(),
                "Unplanned work",
                null,
                CompletionHorizon.EOD,
                category.getId(),
                null, null, null,
                List.of("b1", "b2"),
                ReconciliationStatus.PARTIALLY_COMPLETED,
                "Some notes"
        );

        commitmentService.createUnplanned(request, employee);

        verify(reconciliationRecordRepository).save(any(ReconciliationRecord.class));
        ReconciliationRecord saved = rrCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(ReconciliationStatus.PARTIALLY_COMPLETED);
        assertThat(saved.getNotes()).isEqualTo("Some notes");
    }

    @Test
    void createUnplanned_validatesRcdoAndCategory() {
        UUID inactiveCatId = UUID.randomUUID();
        ChessCategory inactiveCategory = ChessCategory.builder()
                .org(org)
                .name("Inactive")
                .isActive(false)
                .build();
        inactiveCategory.setId(inactiveCatId);

        when(cycleRepository.findById(reconcilingCycle.getId())).thenReturn(Optional.of(reconcilingCycle));
        when(chessCategoryRepository.findById(inactiveCatId)).thenReturn(Optional.of(inactiveCategory));

        CreateUnplannedCommitmentRequest request = new CreateUnplannedCommitmentRequest(
                reconcilingCycle.getId(),
                "Unplanned",
                null,
                CompletionHorizon.EOD,
                inactiveCatId,
                null, null, null,
                List.of("b1", "b2"),
                ReconciliationStatus.COMPLETED,
                null
        );

        assertThatThrownBy(() -> commitmentService.createUnplanned(request, employee))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not active");

        verify(commitmentRepository, never()).save(any());
    }

    // -------------------------------------------------------------------------
    // Test helpers
    // -------------------------------------------------------------------------

    private CreateCommitmentRequest buildCreateRequest(UUID cycleId, List<String> bullets) {
        return new CreateCommitmentRequest(
                cycleId,
                "Test commitment",
                null,
                CompletionHorizon.EOD,
                null, null, null, null, null,
                bullets
        );
    }

    private UpdateCommitmentRequest buildUpdateRequest(List<String> bullets) {
        return new UpdateCommitmentRequest(
                "Updated title",
                null,
                CompletionHorizon.EOD,
                null, null, null, null, null,
                bullets
        );
    }

    private Commitment buildCommitment(AppUser user, Cycle cycle, int rank) {
        Commitment c = Commitment.builder()
                .org(org)
                .user(user)
                .cycle(cycle)
                .title("Commitment")
                .completionHorizon(CompletionHorizon.EOD)
                .priorityRank(rank)
                .build();
        return c;
    }

    private ChessCategory buildActiveCategory() {
        ChessCategory category = ChessCategory.builder()
                .org(org)
                .name("Active Cat")
                .isActive(true)
                .build();
        category.setId(UUID.randomUUID());
        return category;
    }

    private RallyCry buildArchivedRallyCry(UUID id) {
        RallyCry rc = RallyCry.builder()
                .org(org)
                .title("Archived RC")
                .build();
        rc.setId(id);
        rc.setArchivedAt(Instant.now().minusSeconds(86400));
        return rc;
    }
}
