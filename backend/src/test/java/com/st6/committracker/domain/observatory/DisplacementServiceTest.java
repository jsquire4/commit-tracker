package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.DisplacementCategory;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.observatory.dto.CategoryCount;
import com.st6.committracker.domain.observatory.dto.DisplacementSummary;
import com.st6.committracker.domain.observatory.dto.ManagerDisplacementReport;
import com.st6.committracker.domain.observatory.dto.NoteCluster;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DisplacementServiceTest {

    @Mock private CycleRepository cycleRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private AppUserRepository appUserRepository;
    @InjectMocks private DisplacementService displacementService;

    private Org org;
    private AppUser manager;
    private AppUser report1;
    private AppUser report2;
    private Cycle cycle1;
    private Cycle cycle2;
    private Cycle cycle3;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        manager = new AppUser(org, "mgr@example.com", "Manager Alpha", UserRole.MANAGER, null);
        manager.setId(UUID.randomUUID());

        report1 = new AppUser(org, "r1@example.com", "Report One", UserRole.EMPLOYEE, manager);
        report1.setId(UUID.randomUUID());

        report2 = new AppUser(org, "r2@example.com", "Report Two", UserRole.EMPLOYEE, manager);
        report2.setId(UUID.randomUUID());

        // Cycles ordered newest-first (matching findByOrgIdOrderByStartsAtDesc)
        cycle3 = Cycle.builder().org(org).label("Week 3").state(CycleState.LOCKED)
                .startsAt(Instant.parse("2025-01-15T00:00:00Z"))
                .endsAt(Instant.parse("2025-01-22T00:00:00Z")).build();
        cycle3.setId(UUID.randomUUID());

        cycle2 = Cycle.builder().org(org).label("Week 2").state(CycleState.LOCKED)
                .startsAt(Instant.parse("2025-01-08T00:00:00Z"))
                .endsAt(Instant.parse("2025-01-15T00:00:00Z")).build();
        cycle2.setId(UUID.randomUUID());

        cycle1 = Cycle.builder().org(org).label("Week 1").state(CycleState.LOCKED)
                .startsAt(Instant.parse("2025-01-01T00:00:00Z"))
                .endsAt(Instant.parse("2025-01-08T00:00:00Z")).build();
        cycle1.setId(UUID.randomUUID());
    }

    // =========================================================
    // aggregateDisplacements tests
    // =========================================================

    @Test
    void aggregateDisplacements_correctCountsAndPercentages() {
        // 10 displacement records: 5 PRODUCTION_EMERGENCY, 3 SCOPE_CHANGE, 2 RESOURCE_BLOCKED
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report1, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report2, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report1, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report2, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report1, cycle2, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report1, cycle1, DisplacementCategory.RESOURCE_BLOCKED, null),
                displaced(report2, cycle2, DisplacementCategory.RESOURCE_BLOCKED, null)
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle3, cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        DisplacementSummary summary = displacementService.aggregateDisplacements(org.getId(), 3);

        assertThat(summary.totalDisplacements()).isEqualTo(10);
        assertThat(summary.byCategory()).hasSize(3);

        CategoryCount prodEmergency = summary.byCategory().stream()
                .filter(c -> c.category() == DisplacementCategory.PRODUCTION_EMERGENCY)
                .findFirst().orElseThrow();
        assertThat(prodEmergency.count()).isEqualTo(5);
        assertThat(prodEmergency.percentage()).isEqualTo(50.0);

        CategoryCount scopeChange = summary.byCategory().stream()
                .filter(c -> c.category() == DisplacementCategory.SCOPE_CHANGE)
                .findFirst().orElseThrow();
        assertThat(scopeChange.count()).isEqualTo(3);
        assertThat(scopeChange.percentage()).isEqualTo(30.0);

        CategoryCount resourceBlocked = summary.byCategory().stream()
                .filter(c -> c.category() == DisplacementCategory.RESOURCE_BLOCKED)
                .findFirst().orElseThrow();
        assertThat(resourceBlocked.count()).isEqualTo(2);
        assertThat(resourceBlocked.percentage()).isEqualTo(20.0);
    }

    @Test
    void aggregateDisplacements_sortedByCountDescending() {
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.OTHER, null),
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report1, cycle2, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report1, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY, null)
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        DisplacementSummary summary = displacementService.aggregateDisplacements(org.getId(), 2);

        assertThat(summary.byCategory()).hasSize(3);
        // First item must have the highest count
        assertThat(summary.byCategory().get(0).category()).isEqualTo(DisplacementCategory.SCOPE_CHANGE);
        assertThat(summary.byCategory().get(0).count()).isEqualTo(3);
    }

    @Test
    void aggregateDisplacements_noCycles_returnsEmpty() {
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId())).thenReturn(List.of());

        DisplacementSummary summary = displacementService.aggregateDisplacements(org.getId(), 4);

        assertThat(summary.totalDisplacements()).isEqualTo(0);
        assertThat(summary.byCategory()).isEmpty();
    }

    @Test
    void aggregateDisplacements_weeklyTrendReflectsCycleOrder() {
        // cycle1 has 3 displacements, cycle2 has 1, cycle3 has 0 (oldest to newest)
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report1, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(report2, cycle2, DisplacementCategory.RESOURCE_BLOCKED, null)
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle3, cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        DisplacementSummary summary = displacementService.aggregateDisplacements(org.getId(), 3);

        Map<Integer, Integer> trend = summary.weeklyTrend();
        // Index 0 = oldest (cycle1), index 1 = cycle2, index 2 = newest (cycle3)
        assertThat(trend.get(0)).isEqualTo(3); // cycle1
        assertThat(trend.get(1)).isEqualTo(1); // cycle2
        assertThat(trend.get(2)).isEqualTo(0); // cycle3
    }

    @Test
    void aggregateDisplacements_respectsWeekCountLimit() {
        // 3 cycles available, but only request 2
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle3, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle2, DisplacementCategory.SCOPE_CHANGE, null)
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle3, cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        DisplacementSummary summary = displacementService.aggregateDisplacements(org.getId(), 2);

        assertThat(summary.totalDisplacements()).isEqualTo(2);
        assertThat(summary.weeklyTrend()).hasSize(2);
    }

    // =========================================================
    // clusterDisplacementNotes tests
    // =========================================================

    @Test
    void clusterDisplacementNotes_identifiesProductionLineAndVendorDelayThemes() {
        // 5 notes with "production line", 3 with "vendor delay"
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY,
                        "The production line issue caused major delays"),
                displaced(report2, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY,
                        "Production line stopped due to equipment failure"),
                displaced(report1, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY,
                        "Critical production line outage reported"),
                displaced(report2, cycle2, DisplacementCategory.PRODUCTION_EMERGENCY,
                        "Production line maintenance took longer than expected"),
                displaced(report1, cycle3, DisplacementCategory.PRODUCTION_EMERGENCY,
                        "Unplanned production line shutdown occurred"),
                displaced(report1, cycle1, DisplacementCategory.EXTERNAL_DEPENDENCY,
                        "Vendor delay impacted our timeline significantly"),
                displaced(report2, cycle2, DisplacementCategory.EXTERNAL_DEPENDENCY,
                        "Another vendor delay pushed back delivery date"),
                displaced(report1, cycle3, DisplacementCategory.EXTERNAL_DEPENDENCY,
                        "Ongoing vendor delay with no resolution date")
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle3, cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 3);

        assertThat(result).containsKey(DisplacementCategory.PRODUCTION_EMERGENCY);
        assertThat(result).containsKey(DisplacementCategory.EXTERNAL_DEPENDENCY);

        // Verify "production line" cluster exists under PRODUCTION_EMERGENCY
        List<NoteCluster> prodClusters = result.get(DisplacementCategory.PRODUCTION_EMERGENCY);
        NoteCluster productionLine = prodClusters.stream()
                .filter(nc -> nc.theme().equals("production line"))
                .findFirst().orElseThrow(() -> new AssertionError("Expected 'production line' cluster"));
        assertThat(productionLine.count()).isEqualTo(5);
        assertThat(productionLine.representativeNotes()).hasSizeLessThanOrEqualTo(3);

        // Verify "vendor delay" cluster exists under EXTERNAL_DEPENDENCY
        List<NoteCluster> vendorClusters = result.get(DisplacementCategory.EXTERNAL_DEPENDENCY);
        NoteCluster vendorDelay = vendorClusters.stream()
                .filter(nc -> nc.theme().equals("vendor delay"))
                .findFirst().orElseThrow(() -> new AssertionError("Expected 'vendor delay' cluster"));
        assertThat(vendorDelay.count()).isEqualTo(3);
    }

    @Test
    void clusterDisplacementNotes_stopWordsAreExcludedFromNgrams() {
        // "the", "in", "for" are all stop words — should not form n-grams
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE,
                        "the big scope change caused delays"),
                displaced(report2, cycle1, DisplacementCategory.SCOPE_CHANGE,
                        "big scope change was unexpected and hard to plan for")
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 1);

        List<NoteCluster> clusters = result.getOrDefault(DisplacementCategory.SCOPE_CHANGE, List.of());
        // "big scope" and "scope change" should be found; "the big" must NOT appear
        List<String> themes = clusters.stream().map(NoteCluster::theme).toList();
        assertThat(themes).doesNotContain("the big");
        assertThat(themes).doesNotContain("for plan");
        // "scope change" should appear (count = 2)
        assertThat(themes).contains("scope change");
    }

    @Test
    void clusterDisplacementNotes_onlyKeepsNgramsWithFrequencyAtLeastTwo() {
        // Only 1 record — no n-gram can reach frequency 2 → no clusters
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.DEPRIORITIZED,
                        "project was suddenly deprioritized by leadership team")
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 1);

        assertThat(result).isEmpty();
    }

    @Test
    void clusterDisplacementNotes_representativeNotesLimitedToThree() {
        // 5 notes all containing "scope creep" — representative notes should be capped at 3
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE, "scope creep added two weeks"),
                displaced(report2, cycle1, DisplacementCategory.SCOPE_CHANGE, "scope creep delayed delivery"),
                displaced(report1, cycle2, DisplacementCategory.SCOPE_CHANGE, "major scope creep occurred"),
                displaced(report2, cycle2, DisplacementCategory.SCOPE_CHANGE, "scope creep was uncontrolled"),
                displaced(report1, cycle3, DisplacementCategory.SCOPE_CHANGE, "scope creep expanded requirements")
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle3, cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 3);

        List<NoteCluster> clusters = result.getOrDefault(DisplacementCategory.SCOPE_CHANGE, List.of());
        NoteCluster scopeCreep = clusters.stream()
                .filter(nc -> nc.theme().equals("scope creep"))
                .findFirst().orElseThrow();
        assertThat(scopeCreep.count()).isEqualTo(5);
        assertThat(scopeCreep.representativeNotes()).hasSize(3);
    }

    @Test
    void clusterDisplacementNotes_affectedTeamsAndUsersPopulated() {
        List<ReconciliationRecord> records = List.of(
                displaced(report1, cycle1, DisplacementCategory.RESOURCE_BLOCKED,
                        "resource blocked by infrastructure team"),
                displaced(report2, cycle2, DisplacementCategory.RESOURCE_BLOCKED,
                        "resource blocked pending approval")
        );

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle2, cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(records);

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 2);

        List<NoteCluster> clusters = result.getOrDefault(DisplacementCategory.RESOURCE_BLOCKED, List.of());
        NoteCluster resourceBlocked = clusters.stream()
                .filter(nc -> nc.theme().equals("resource blocked"))
                .findFirst().orElseThrow();
        assertThat(resourceBlocked.affectedUsers()).containsExactlyInAnyOrder("Report One", "Report Two");
        // Both users report to "Manager Alpha"
        assertThat(resourceBlocked.affectedTeams()).contains("Manager Alpha");
    }

    @Test
    void clusterDisplacementNotes_emptyCycles_returnsEmptyMap() {
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId())).thenReturn(List.of());

        Map<DisplacementCategory, List<NoteCluster>> result =
                displacementService.clusterDisplacementNotes(org.getId(), 4);

        assertThat(result).isEmpty();
    }

    // =========================================================
    // getDisplacementsByManager tests
    // =========================================================

    @Test
    void getDisplacementsByManager_filtersToTeamOnly() {
        // report1 and report2 are in manager's team; outsider is not
        AppUser outsider = new AppUser(org, "out@example.com", "Outsider", UserRole.EMPLOYEE, null);
        outsider.setId(UUID.randomUUID());

        List<ReconciliationRecord> allOrgRecords = List.of(
                displaced(report1, cycle1, DisplacementCategory.SCOPE_CHANGE, null),
                displaced(report2, cycle1, DisplacementCategory.PRODUCTION_EMERGENCY, null),
                displaced(outsider, cycle1, DisplacementCategory.OTHER, null)
        );

        when(appUserRepository.findById(manager.getId())).thenReturn(Optional.of(manager));
        when(appUserRepository.findSubtreeUserIds(manager.getId()))
                .thenReturn(List.of(report1.getId(), report2.getId()));
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId()))
                .thenReturn(List.of(cycle1));
        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(org.getId()), any(Collection.class)))
                .thenReturn(allOrgRecords);

        ManagerDisplacementReport report =
                displacementService.getDisplacementsByManager(org.getId(), manager.getId(), 1);

        // Only the 2 team records should be counted, not the outsider's
        assertThat(report.totalDisplacements()).isEqualTo(2);
        assertThat(report.managerName()).isEqualTo("Manager Alpha");
    }

    // =========================================================
    // Helper factory methods
    // =========================================================

    private ReconciliationRecord displaced(AppUser user, Cycle cycle,
                                           DisplacementCategory category, String detail) {
        Commitment commitment = new Commitment(org, user, cycle, "Test commitment", CompletionHorizon.EOW);
        commitment.setId(UUID.randomUUID());

        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org)
                .commitment(commitment)
                .cycle(cycle)
                .status(ReconciliationStatus.NOT_STARTED)
                .reconciledAt(Instant.now())
                .reconciledBy(user)
                .displacementCategory(category)
                .displacementDetail(detail)
                .build();
        record.setId(UUID.randomUUID());
        return record;
    }
}
