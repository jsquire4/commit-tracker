package com.st6.committracker.domain.dashboard;

import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.ChessCategoryRepository;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.dashboard.dto.AlignmentSignalResponse;
import com.st6.committracker.domain.dashboard.dto.AssignmentAttributionResponse;
import com.st6.committracker.domain.dashboard.dto.DashboardFilters;
import com.st6.committracker.domain.dashboard.dto.RcdoCoverageResponse;
import com.st6.committracker.domain.dashboard.dto.TeamRollupResponse;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.security.VisibilityEnforcer;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private ChessCategoryRepository chessCategoryRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private VisibilityEnforcer visibilityEnforcer;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @InjectMocks private DashboardService dashboardService;

    private Org org;
    private AppUser manager;
    private AppUser director;
    private AppUser employee;
    private AppUser report1;
    private AppUser report2;
    private Cycle activeCycle;
    private ChessCategory catA;
    private ChessCategory catB;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        manager = new AppUser(org, "mgr@example.com", "Manager", UserRole.MANAGER, null);
        manager.setId(UUID.randomUUID());

        director = new AppUser(org, "dir@example.com", "Director", UserRole.DIRECTOR, null);
        director.setId(UUID.randomUUID());

        employee = new AppUser(org, "emp@example.com", "Employee", UserRole.EMPLOYEE, null);
        employee.setId(UUID.randomUUID());

        report1 = new AppUser(org, "r1@example.com", "Report One", UserRole.EMPLOYEE, manager);
        report1.setId(UUID.randomUUID());

        report2 = new AppUser(org, "r2@example.com", "Report Two", UserRole.EMPLOYEE, manager);
        report2.setId(UUID.randomUUID());

        activeCycle = Cycle.builder()
                .org(org)
                .label("Week 1")
                .state(CycleState.LOCKED)
                .startsAt(Instant.now())
                .endsAt(Instant.now().plusSeconds(604800))
                .isActive(true)
                .build();
        activeCycle.setId(UUID.randomUUID());

        catA = ChessCategory.builder().org(org).name("Strategy").sortOrder(0).isActive(true).build();
        catA.setId(UUID.randomUUID());

        catB = ChessCategory.builder().org(org).name("Operations").sortOrder(1).isActive(true).build();
        catB.setId(UUID.randomUUID());
    }

    // =========================================================
    // Team rollup tests
    // =========================================================

    @Test
    void getTeamRollup_asManager_returnsDirectReportsSummary() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        Commitment r1c1 = commitment(report1, catA);
        Commitment r1c2 = commitment(report1, catA);
        Commitment r2c1 = commitment(report2, catB);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1, report2));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(r1c1, r1c2, r2c1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(any(), eq(activeCycle.getId())))
                .thenReturn(List.of());

        TeamRollupResponse response = dashboardService.getTeamRollup(manager, filters);

        assertThat(response.members()).hasSize(2);
        TeamRollupResponse.TeamMemberSummary r1Summary = response.members().stream()
                .filter(m -> m.userId().equals(report1.getId()))
                .findFirst().orElseThrow();
        assertThat(r1Summary.totalCommitments()).isEqualTo(2);
        assertThat(r1Summary.cycleState()).isEqualTo(CycleState.LOCKED);
        assertThat(r1Summary.categoryBreakdown()).containsEntry("Strategy", 2);
    }

    @Test
    void getTeamRollup_asDirector_includesSubtreeWhenFlagged() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, true);
        UUID subtreeUserId = UUID.randomUUID();
        AppUser subtreeUser = new AppUser(org, "sub@example.com", "Sub User", UserRole.EMPLOYEE, report1);
        subtreeUser.setId(subtreeUserId);

        when(userRepository.findSubtreeUserIds(director.getId()))
                .thenReturn(List.of(subtreeUserId));
        when(userRepository.findAllById(List.of(subtreeUserId)))
                .thenReturn(List.of(subtreeUser));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(any(), eq(activeCycle.getId())))
                .thenReturn(List.of());

        TeamRollupResponse response = dashboardService.getTeamRollup(director, filters);

        assertThat(response.members()).hasSize(1);
        assertThat(response.members().get(0).userId()).isEqualTo(subtreeUserId);
        verify(userRepository).findSubtreeUserIds(director.getId());
        verify(userRepository, never()).findDirectReports(any(), any());
    }

    @Test
    void getTeamRollup_asEmployee_throwsForbidden() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        assertThatThrownBy(() -> dashboardService.getTeamRollup(employee, filters))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("MANAGER");
    }

    @Test
    void getTeamRollup_filtersByCycle() {
        Instant weekStart = Instant.parse("2026-03-09T00:00:00Z");
        Cycle specificCycle = Cycle.builder()
                .org(org)
                .label("Week of Mar 9")
                .state(CycleState.RECONCILED)
                .startsAt(weekStart)
                .endsAt(weekStart.plusSeconds(604800))
                .isActive(false)
                .build();
        specificCycle.setId(UUID.randomUUID());

        DashboardFilters filters = new DashboardFilters(weekStart, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(specificCycle, activeCycle));
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(specificCycle.getId())))
                .thenReturn(List.of(commitment(report1, catA)));
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(any(), eq(specificCycle.getId())))
                .thenReturn(List.of());

        TeamRollupResponse response = dashboardService.getTeamRollup(manager, filters);

        assertThat(response.members()).hasSize(1);
        assertThat(response.members().get(0).cycleState()).isEqualTo(CycleState.RECONCILED);
    }

    // =========================================================
    // Alignment signal tests
    // =========================================================

    @Test
    void getAlignmentSignal_computesCorrectPercentages() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        // 2 Strategy, 1 Operations → 66.7% / 33.3%
        Commitment c1 = commitment(report1, catA);
        Commitment c2 = commitment(report1, catA);
        Commitment c3 = commitment(report1, catB);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(c1, c2, c3));

        AlignmentSignalResponse response = dashboardService.getAlignmentSignal(manager, filters);

        assertThat(response.teamSize()).isEqualTo(1);
        assertThat(response.distribution()).containsKey("Strategy");
        assertThat(response.distribution().get("Strategy").count()).isEqualTo(2);
        assertThat(response.distribution().get("Strategy").percentage()).isCloseTo(66.67, within(0.1));
        assertThat(response.distribution().get("Operations").count()).isEqualTo(1);
        assertThat(response.unlinkedCount()).isEqualTo(0);
    }

    @Test
    void getAlignmentSignal_noCommitments_returnsZeroes() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of());

        AlignmentSignalResponse response = dashboardService.getAlignmentSignal(manager, filters);

        assertThat(response.distribution()).isEmpty();
        assertThat(response.unlinkedCount()).isEqualTo(0);
        assertThat(response.byTeamMember()).hasSize(1);
        assertThat(response.byTeamMember().get(0).unlinkedCount()).isEqualTo(0);
    }

    @Test
    void getAlignmentSignal_includesPerMemberBreakdown() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1, report2));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        Commitment r1c = commitment(report1, catA);
        Commitment r2c = commitment(report2, catB);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(r1c, r2c));

        AlignmentSignalResponse response = dashboardService.getAlignmentSignal(manager, filters);

        assertThat(response.byTeamMember()).hasSize(2);
        AlignmentSignalResponse.MemberAlignment r1Alignment = response.byTeamMember().stream()
                .filter(m -> m.userId().equals(report1.getId()))
                .findFirst().orElseThrow();
        assertThat(r1Alignment.distribution()).containsKey("Strategy");
        assertThat(r1Alignment.distribution().get("Strategy").count()).isEqualTo(1);
    }

    @Test
    void getAlignmentSignal_countsUnlinkedSeparately() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        // 1 linked, 2 unlinked (null category)
        Commitment linked = commitment(report1, catA);
        Commitment unlinked1 = commitment(report1, null);
        Commitment unlinked2 = commitment(report1, null);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(linked, unlinked1, unlinked2));

        AlignmentSignalResponse response = dashboardService.getAlignmentSignal(manager, filters);

        assertThat(response.unlinkedCount()).isEqualTo(2);
        assertThat(response.distribution()).containsKey("Strategy");
        assertThat(response.distribution()).hasSize(1);
    }

    // =========================================================
    // Assignment attribution tests
    // =========================================================

    @Test
    void getAssignmentAttribution_computesSelfVsAssigned() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        // 2 self-directed, 1 assigned
        Commitment selfC1 = commitment(report1, catA);
        Commitment selfC2 = commitment(report1, catB);
        Commitment assignedC = commitmentAssignedBy(report1, catA, manager);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(selfC1, selfC2, assignedC));

        AssignmentAttributionResponse response = dashboardService.getAssignmentAttribution(manager, filters);

        assertThat(response.totalCommitments()).isEqualTo(3);
        assertThat(response.selfDirectedCount()).isEqualTo(2);
        assertThat(response.managerAssignedCount()).isEqualTo(1);
        assertThat(response.selfDirectedPercentage()).isCloseTo(66.67, within(0.1));
        assertThat(response.managerAssignedPercentage()).isCloseTo(33.33, within(0.1));
    }

    @Test
    void getAssignmentAttribution_identifiesDependencyRisk() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1, report2));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));

        // report1 gets all 2 assigned out of 2 total → 100% concentration risk
        Commitment a1 = commitmentAssignedBy(report1, catA, manager);
        Commitment a2 = commitmentAssignedBy(report1, catA, manager);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(a1, a2));

        AssignmentAttributionResponse response = dashboardService.getAssignmentAttribution(manager, filters);

        assertThat(response.concentrationRisks()).hasSize(1);
        assertThat(response.concentrationRisks().get(0).assignedToUserId()).isEqualTo(report1.getId());
        assertThat(response.concentrationRisks().get(0).assignmentCount()).isEqualTo(2);
    }

    @Test
    void getAssignmentAttribution_noAssignments_returnsAllSelfDirected() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(commitment(report1, catA), commitment(report1, catB)));

        AssignmentAttributionResponse response = dashboardService.getAssignmentAttribution(manager, filters);

        assertThat(response.managerAssignedCount()).isEqualTo(0);
        assertThat(response.selfDirectedCount()).isEqualTo(2);
        assertThat(response.selfDirectedPercentage()).isCloseTo(100.0, within(0.01));
        assertThat(response.concentrationRisks()).isEmpty();
    }

    // =========================================================
    // RCDO coverage tests
    // =========================================================

    @Test
    void getRcdoCoverage_computesLinkagePercentages() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);
        RallyCry rc = rallyCry("Rally Cry One");

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        Commitment linked = commitmentWithRallyCry(report1, catA, rc);
        Commitment unlinked = commitment(report1, catA);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(linked, unlinked));
        when(definingObjectiveRepository.findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(rc.getId()))
                .thenReturn(List.of());

        RcdoCoverageResponse response = dashboardService.getRcdoCoverage(manager, filters);

        assertThat(response.totalCommitments()).isEqualTo(2);
        assertThat(response.linkedCount()).isEqualTo(1);
        assertThat(response.unlinkedCount()).isEqualTo(1);
        assertThat(response.linkedPercentage()).isCloseTo(50.0, within(0.01));
    }

    @Test
    void getRcdoCoverage_identifiesUnlinkedCommitments() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));
        // All unlinked (no rally cry)
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(commitment(report1, catA), commitment(report1, catB)));

        RcdoCoverageResponse response = dashboardService.getRcdoCoverage(manager, filters);

        assertThat(response.unlinkedCount()).isEqualTo(2);
        assertThat(response.linkedCount()).isEqualTo(0);
        assertThat(response.linkedPercentage()).isEqualTo(0.0);
        assertThat(response.byRallyCry()).isEmpty();
    }

    @Test
    void getRcdoCoverage_identifiesUncoveredDefiningObjectives() {
        DashboardFilters filters = new DashboardFilters(null, null, null, null, false);
        RallyCry rc = rallyCry("Rally Cry One");

        DefiningObjective coveredDo = definingObjective("Covered DO", rc);
        DefiningObjective uncoveredDo = definingObjective("Uncovered DO", rc);

        when(userRepository.findDirectReports(org.getId(), manager.getId()))
                .thenReturn(List.of(report1));
        when(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(Optional.of(activeCycle));

        // One commitment linked to coveredDo via rally cry
        Commitment linked = commitmentWithRallyCryAndDo(report1, catA, rc, coveredDo);
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(activeCycle.getId())))
                .thenReturn(List.of(linked));
        when(definingObjectiveRepository.findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(rc.getId()))
                .thenReturn(List.of(coveredDo, uncoveredDo));

        RcdoCoverageResponse response = dashboardService.getRcdoCoverage(manager, filters);

        assertThat(response.uncoveredObjectives()).hasSize(1);
        assertThat(response.uncoveredObjectives().get(0).definingObjectiveId()).isEqualTo(uncoveredDo.getId());
        assertThat(response.uncoveredObjectives().get(0).title()).isEqualTo("Uncovered DO");
        assertThat(response.uncoveredObjectives().get(0).rallyCryTitle()).isEqualTo("Rally Cry One");
    }

    // =========================================================
    // Test helpers
    // =========================================================

    private Commitment commitment(AppUser user, ChessCategory category) {
        Commitment c = new Commitment(org, user, activeCycle, "Test commitment", com.st6.committracker.domain.CompletionHorizon.EOW);
        c.setId(UUID.randomUUID());
        c.setChessCategory(category);
        return c;
    }

    private Commitment commitmentAssignedBy(AppUser user, ChessCategory category, AppUser assignedBy) {
        Commitment c = commitment(user, category);
        c.setAssignedBy(assignedBy);
        return c;
    }

    private Commitment commitmentWithRallyCry(AppUser user, ChessCategory category, RallyCry rallyCry) {
        Commitment c = commitment(user, category);
        c.setRallyCry(rallyCry);
        return c;
    }

    private Commitment commitmentWithRallyCryAndDo(AppUser user, ChessCategory category,
                                                    RallyCry rallyCry, DefiningObjective definingObjective) {
        Commitment c = commitmentWithRallyCry(user, category, rallyCry);
        c.setDefiningObjective(definingObjective);
        return c;
    }

    private RallyCry rallyCry(String title) {
        RallyCry rc = new RallyCry(org, title, null, 0);
        rc.setId(UUID.randomUUID());
        return rc;
    }

    private DefiningObjective definingObjective(String title, RallyCry rallyCry) {
        DefiningObjective doObj = new DefiningObjective(org, rallyCry, title, null, null, 0);
        doObj.setId(UUID.randomUUID());
        return doObj;
    }
}
