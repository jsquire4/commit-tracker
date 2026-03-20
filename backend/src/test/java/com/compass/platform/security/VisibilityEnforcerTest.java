package com.compass.platform.security;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
@DisplayName("VisibilityEnforcer")
class VisibilityEnforcerTest {

    @Mock private AppUserRepository userRepository;
    @Mock private AnalystScopeRepository analystScopeRepository;
    @Mock private DefiningObjectiveRepository definingObjectiveRepository;
    @Mock private OutcomeRepository outcomeRepository;

    private VisibilityEnforcer enforcer;

    // Org
    private Org org;

    // Users
    private AppUser executive;
    private AppUser director;
    private AppUser managerA;
    private AppUser managerB;
    private AppUser employeeA1;
    private AppUser employeeA2;
    private AppUser employeeB1;
    private AppUser analyst;

    // RCDO
    private RallyCry rallyCry;
    private DefiningObjective doOwnedByManagerA;
    private Outcome outcomeOwnedByManagerA;

    @BeforeEach
    void setUp() {
        // Build strategies with mocked repositories
        EmployeeVisibility employeeVis = new EmployeeVisibility();
        ManagerVisibility managerVis = new ManagerVisibility(userRepository);
        HierarchyVisibility hierarchyVis = new HierarchyVisibility(userRepository);
        ExecutiveVisibility executiveVis = new ExecutiveVisibility(userRepository);
        AnalystVisibility analystVis = new AnalystVisibility(analystScopeRepository, userRepository);

        enforcer = new VisibilityEnforcer(
                List.of(employeeVis, managerVis, hierarchyVis, executiveVis, analystVis),
                definingObjectiveRepository,
                outcomeRepository
        );

        // Build org
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .build();

        // Build hierarchy: executive -> director -> managerA -> employeeA1, employeeA2
        //                                         -> managerB -> employeeB1
        executive = makeUser(UserRole.EXECUTIVE, null);
        director = makeUser(UserRole.DIRECTOR, executive);
        managerA = makeUser(UserRole.MANAGER, director);
        managerB = makeUser(UserRole.MANAGER, director);
        employeeA1 = makeUser(UserRole.EMPLOYEE, managerA);
        employeeA2 = makeUser(UserRole.EMPLOYEE, managerA);
        employeeB1 = makeUser(UserRole.EMPLOYEE, managerB);
        analyst = makeUser(UserRole.ANALYST, null);

        // Build RCDO
        rallyCry = RallyCry.builder().org(org).title("RC1").sortOrder(0).build();
        rallyCry.setId(UUID.randomUUID());

        doOwnedByManagerA = DefiningObjective.builder()
                .org(org).rallyCry(rallyCry).title("DO1").owner(managerA).sortOrder(0).build();
        doOwnedByManagerA.setId(UUID.randomUUID());

        outcomeOwnedByManagerA = Outcome.builder()
                .org(org).definingObjective(doOwnedByManagerA).title("O1").owner(managerA).sortOrder(0).build();
        outcomeOwnedByManagerA.setId(UUID.randomUUID());

        // Lenient stubs for RCDO lookups — these are only called when role-based check fails.
        // Using lenient() avoids UnnecessaryStubbingException in tests where the commitment
        // is already visible via the role strategy (short-circuit in canViewCommitment).
        Mockito.lenient().when(definingObjectiveRepository.findByOwnerIdAndArchivedAtIsNull(any()))
                .thenReturn(List.of());
        Mockito.lenient().when(outcomeRepository.findByOwnerIdAndArchivedAtIsNull(any()))
                .thenReturn(List.of());
    }

    // --------------- Helper methods ---------------

    private AppUser makeUser(UserRole role, AppUser reportsTo) {
        AppUser u = new AppUser(org, role.name().toLowerCase() + "@test.com",
                role.name(), role, reportsTo);
        u.setId(UUID.randomUUID());
        return u;
    }

    private Commitment makeCommitmentFor(AppUser user) {
        Commitment c = new Commitment(org, user, null, "commitment", CompletionHorizon.EOW);
        c.setId(UUID.randomUUID());
        return c;
    }

    // === Self-visibility ===

    @Test
    @DisplayName("Employee can view own commitments")
    void employee_canViewOwnCommitments() {
        Commitment ownCommitment = makeCommitmentFor(employeeA1);
        assertThat(enforcer.canViewCommitment(employeeA1, ownCommitment)).isTrue();
    }

    // === Manager visibility ===

    @Test
    @DisplayName("Employee cannot view other employee's commitments")
    void employee_cannotViewOtherEmployeeCommitments() {
        Commitment otherCommitment = makeCommitmentFor(employeeA2);
        assertThat(enforcer.canViewCommitment(employeeA1, otherCommitment)).isFalse();
    }

    @Test
    @DisplayName("Manager can view direct report's commitments")
    void manager_canViewDirectReportCommitments() {
        Mockito.when(userRepository.findByReportsToId(managerA.getId()))
                .thenReturn(List.of(employeeA1, employeeA2));

        Commitment directReportCommitment = makeCommitmentFor(employeeA1);
        assertThat(enforcer.canViewCommitment(managerA, directReportCommitment)).isTrue();
    }

    @Test
    @DisplayName("Manager cannot view non-report's commitments")
    void manager_cannotViewNonReportCommitments() {
        Mockito.when(userRepository.findByReportsToId(managerA.getId()))
                .thenReturn(List.of(employeeA1, employeeA2));

        // employeeB1 reports to managerB, not managerA
        Commitment nonReportCommitment = makeCommitmentFor(employeeB1);
        assertThat(enforcer.canViewCommitment(managerA, nonReportCommitment)).isFalse();
    }

    // === Director and above ===

    @Test
    @DisplayName("Director can view full subtree (transitive reports)")
    void director_canViewFullSubtree() {
        List<UUID> subtreeIds = List.of(
                managerA.getId(), managerB.getId(),
                employeeA1.getId(), employeeA2.getId(), employeeB1.getId()
        );
        Mockito.when(userRepository.findSubtreeUserIds(director.getId())).thenReturn(subtreeIds);

        Commitment c1 = makeCommitmentFor(employeeA1);
        Commitment c2 = makeCommitmentFor(employeeB1);
        Commitment c3 = makeCommitmentFor(managerA);

        assertThat(enforcer.canViewCommitment(director, c1)).isTrue();
        assertThat(enforcer.canViewCommitment(director, c2)).isTrue();
        assertThat(enforcer.canViewCommitment(director, c3)).isTrue();
    }

    @Test
    @DisplayName("Executive can view entire org")
    void executive_canViewEntireOrg() {
        List<AppUser> allOrgUsers = List.of(
                executive, director, managerA, managerB, employeeA1, employeeA2, employeeB1, analyst
        );
        Mockito.when(userRepository.findByOrgIdAndIsActiveTrue(org.getId())).thenReturn(allOrgUsers);

        Commitment c = makeCommitmentFor(employeeB1);
        assertThat(enforcer.canViewCommitment(executive, c)).isTrue();
    }

    // === Analyst scoping ===

    @Test
    @DisplayName("Analyst can view within scope - RCDO-based")
    void analyst_canViewWithinScope_rcdoBased() {
        // Analyst has a rally-cry scope — expands to all active org users
        AnalystScope rcScope = AnalystScope.builder()
                .org(org).analyst(analyst).rallyCry(rallyCry).build();
        rcScope.setId(UUID.randomUUID());

        Mockito.when(analystScopeRepository.findByAnalystId(analyst.getId()))
                .thenReturn(List.of(rcScope));
        Mockito.when(userRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(List.of(executive, director, managerA, managerB,
                        employeeA1, employeeA2, employeeB1, analyst));

        Commitment c = makeCommitmentFor(employeeA1);
        assertThat(enforcer.canViewCommitment(analyst, c)).isTrue();
    }

    @Test
    @DisplayName("Analyst can view within scope - org unit based")
    void analyst_canViewWithinScope_orgUnitBased() {
        // Analyst scoped to managerA's subtree
        AnalystScope orgUnitScope = AnalystScope.builder()
                .org(org).analyst(analyst).orgUnitRoot(managerA).build();
        orgUnitScope.setId(UUID.randomUUID());

        Mockito.when(analystScopeRepository.findByAnalystId(analyst.getId()))
                .thenReturn(List.of(orgUnitScope));
        Mockito.when(userRepository.findSubtreeUserIds(managerA.getId()))
                .thenReturn(List.of(employeeA1.getId(), employeeA2.getId()));

        Commitment c1 = makeCommitmentFor(employeeA1);
        Commitment c2 = makeCommitmentFor(managerA); // managerA is the root, also included

        assertThat(enforcer.canViewCommitment(analyst, c1)).isTrue();
        assertThat(enforcer.canViewCommitment(analyst, c2)).isTrue();
    }

    @Test
    @DisplayName("Analyst cannot view outside scope")
    void analyst_cannotViewOutsideScope() {
        // Analyst scoped only to managerA's subtree — cannot see managerB's reports
        AnalystScope orgUnitScope = AnalystScope.builder()
                .org(org).analyst(analyst).orgUnitRoot(managerA).build();
        orgUnitScope.setId(UUID.randomUUID());

        Mockito.when(analystScopeRepository.findByAnalystId(analyst.getId()))
                .thenReturn(List.of(orgUnitScope));
        Mockito.when(userRepository.findSubtreeUserIds(managerA.getId()))
                .thenReturn(List.of(employeeA1.getId(), employeeA2.getId()));

        Commitment c = makeCommitmentFor(employeeB1);
        assertThat(enforcer.canViewCommitment(analyst, c)).isFalse();
    }

    // === RCDO owner cross-cutting ===

    @Test
    @DisplayName("RCDO owner can view linked commitments regardless of reporting line")
    void rcdoOwner_canViewLinkedCommitments() {
        // managerA owns doOwnedByManagerA; employeeB1 has a commitment linked to that DO
        // employeeB1 does not report to managerA, so normal visibility would deny it
        Mockito.when(userRepository.findByReportsToId(managerA.getId()))
                .thenReturn(List.of(employeeA1, employeeA2));
        // Override the lenient stub for this specific test to return the owned DO
        Mockito.when(definingObjectiveRepository.findByOwnerIdAndArchivedAtIsNull(managerA.getId()))
                .thenReturn(List.of(doOwnedByManagerA));

        // Commitment linked to managerA's DO for employeeB1 (out of reporting chain)
        Commitment c = Commitment.builder()
                .org(org).user(employeeB1).cycle(null).title("linked commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .definingObjective(doOwnedByManagerA)
                .build();
        c.setId(UUID.randomUUID());

        assertThat(enforcer.canViewCommitment(managerA, c)).isTrue();
    }

    @Test
    @DisplayName("RCDO owner cannot view unlinked commitments of non-reports")
    void rcdoOwner_cannotViewUnlinkedCommitments() {
        Mockito.when(userRepository.findByReportsToId(managerA.getId()))
                .thenReturn(List.of(employeeA1, employeeA2));
        // The lenient stub already returns empty for RCDO lookups

        // Commitment for employeeB1 with NO RCDO link
        Commitment c = makeCommitmentFor(employeeB1);
        assertThat(enforcer.canViewCommitment(managerA, c)).isFalse();
    }

    // === Batch filtering ===

    @Test
    @DisplayName("filterVisible returns only accessible commitments from a mixed list")
    void filterVisible_returnsOnlyAccessible() {
        Mockito.when(userRepository.findByReportsToId(managerA.getId()))
                .thenReturn(List.of(employeeA1, employeeA2));

        Commitment ownCommitment = makeCommitmentFor(managerA);
        Commitment directReportCommitment = makeCommitmentFor(employeeA1);
        Commitment outsideCommitment = makeCommitmentFor(employeeB1); // not visible

        List<Commitment> result = enforcer.filterVisible(managerA,
                List.of(ownCommitment, directReportCommitment, outsideCommitment));

        assertThat(result).containsExactlyInAnyOrder(ownCommitment, directReportCommitment);
        assertThat(result).doesNotContain(outsideCommitment);
    }

    // === Edge cases ===

    @Test
    @DisplayName("Management chain check guards against cycles (max depth)")
    void managementChainCheck_guardsAgainstCycles() {
        // The subtree CTE handles cycle detection at DB level.
        // This test verifies computeVisibleUserIds terminates and returns the expected set.
        List<UUID> subtreeIds = List.of(managerA.getId(), employeeA1.getId());
        Mockito.when(userRepository.findSubtreeUserIds(director.getId())).thenReturn(subtreeIds);

        var visibleIds = enforcer.computeVisibleUserIds(director);
        assertThat(visibleIds).contains(director.getId());
        assertThat(visibleIds).containsAll(subtreeIds);
    }

    @Test
    @DisplayName("Inactive user is not visible")
    void inactiveUser_notVisible() {
        // Make an inactive user
        AppUser inactiveEmployee = makeUser(UserRole.EMPLOYEE, managerA);
        inactiveEmployee.setActive(false);

        // Executive sees only active users via findByOrgIdAndIsActiveTrue
        // (inactive user is NOT in the returned list — the repository method filters by isActive=true)
        Mockito.when(userRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                .thenReturn(List.of(executive, director, managerA, managerB,
                        employeeA1, employeeA2, employeeB1, analyst));

        Commitment inactiveCommitment = makeCommitmentFor(inactiveEmployee);
        assertThat(enforcer.canViewCommitment(executive, inactiveCommitment)).isFalse();
    }
}
