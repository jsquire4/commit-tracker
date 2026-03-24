package com.compass.platform.domain.observatory;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.DriftMetric;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSeverity;
import com.compass.platform.domain.observatory.dto.IntegrityFlag;
import com.compass.platform.domain.observatory.dto.IntegrityFlagType;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.TeamAlignmentTrend;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.reconciliation.ReconciliationRecord;
import com.compass.platform.domain.reconciliation.ReconciliationRecordRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriftDetectionServiceTest {

    @Mock private ObservatoryConfigRepository configRepository;
    @Mock private AppUserRepository userRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private AnalyticsService analyticsService;

    @InjectMocks private DriftDetectionService driftDetectionService;

    private Org org;
    private AppUser manager;
    private ObservatoryConfig defaultConfig;
    private UUID orgId;
    private UUID managerId;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        managerId = UUID.randomUUID();

        org = Org.builder()
                .id(orgId)
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        manager = new AppUser(org, "mgr@example.com", "Manager One", UserRole.MANAGER, null);
        manager.setId(managerId);

        // Default config: emerging=3, sustained=6, structural=12, uniformityThreshold=90.0
        defaultConfig = ObservatoryConfig.builder()
                .org(org)
                .driftEmergingWeeks(3)
                .driftSustainedWeeks(6)
                .driftStructuralWeeks(12)
                .uniformityThreshold(new BigDecimal("90.0"))
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // detectDrift — ALIGNMENT signals
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void detectDrift_threeWeekDecliningAlignment_emitsEmergingSignal() {
        // Arrange: 5 weeks of data, 3 most-recent declining
        List<AlignmentDataPoint> dataPoints = List.of(
                alignmentPoint(75.0, 1),
                alignmentPoint(75.0, 2),
                alignmentPoint(70.0, 3),
                alignmentPoint(64.0, 4),
                alignmentPoint(58.0, 5)
        );
        TeamAlignmentTrend trend = new TeamAlignmentTrend(
                managerId, "Manager One", "MANAGER", 3, dataPoints);

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(analyticsService.computeTeamAlignmentTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(trend);
        when(analyticsService.computeTeamCompletionTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(List.of());
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        // Act
        DriftReport report = driftDetectionService.detectDrift(orgId);

        // Assert
        assertThat(report.signals()).hasSize(1);
        assertThat(report.signals().get(0).metric()).isEqualTo(DriftMetric.ALIGNMENT);
        assertThat(report.signals().get(0).severity()).isEqualTo(DriftSeverity.EMERGING);
        assertThat(report.signals().get(0).weekCount()).isEqualTo(3);
        assertThat(report.signals().get(0).unitId()).isEqualTo(managerId);
        assertThat(report.generatedAt()).isNotNull();
    }

    @Test
    void detectDrift_twoWeekDecline_belowEmergingThreshold_noSignalEmitted() {
        // Only 2 consecutive declines — below the emerging threshold of 3
        List<AlignmentDataPoint> dataPoints = List.of(
                alignmentPoint(75.0, 1),
                alignmentPoint(75.0, 2),
                alignmentPoint(75.0, 3),
                alignmentPoint(64.0, 4),
                alignmentPoint(58.0, 5)
        );
        TeamAlignmentTrend trend = new TeamAlignmentTrend(
                managerId, "Manager One", "MANAGER", 3, dataPoints);

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(analyticsService.computeTeamAlignmentTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(trend);
        when(analyticsService.computeTeamCompletionTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(List.of());
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        DriftReport report = driftDetectionService.detectDrift(orgId);

        assertThat(report.signals()).isEmpty();
    }

    @Test
    void detectDrift_customEmergingThreshold_signalAppearsEarlier() {
        // Config with emerging=2 — should fire on a 2-week decline
        ObservatoryConfig tightConfig = ObservatoryConfig.builder()
                .org(org)
                .driftEmergingWeeks(2)
                .driftSustainedWeeks(4)
                .driftStructuralWeeks(8)
                .uniformityThreshold(new BigDecimal("90.0"))
                .build();

        List<AlignmentDataPoint> dataPoints = List.of(
                alignmentPoint(75.0, 1),
                alignmentPoint(75.0, 2),
                alignmentPoint(64.0, 3),
                alignmentPoint(58.0, 4)
        );
        TeamAlignmentTrend trend = new TeamAlignmentTrend(
                managerId, "Manager One", "MANAGER", 3, dataPoints);

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(tightConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(analyticsService.computeTeamAlignmentTrend(eq(orgId), eq(managerId), eq(8)))
                .thenReturn(trend);
        when(analyticsService.computeTeamCompletionTrend(eq(orgId), eq(managerId), eq(8)))
                .thenReturn(List.of());
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        DriftReport report = driftDetectionService.detectDrift(orgId);

        assertThat(report.signals()).hasSize(1);
        assertThat(report.signals().get(0).severity()).isEqualTo(DriftSeverity.EMERGING);
        assertThat(report.signals().get(0).weekCount()).isEqualTo(2);
    }

    @Test
    void detectDrift_sixWeekDecline_emitsSustainedSignal() {
        // 6 consecutive declining weeks → SUSTAINED (threshold=6)
        List<AlignmentDataPoint> dataPoints = List.of(
                alignmentPoint(80.0, 1),
                alignmentPoint(74.0, 2),
                alignmentPoint(68.0, 3),
                alignmentPoint(62.0, 4),
                alignmentPoint(56.0, 5),
                alignmentPoint(50.0, 6),
                alignmentPoint(44.0, 7)
        );
        TeamAlignmentTrend trend = new TeamAlignmentTrend(
                managerId, "Manager One", "MANAGER", 3, dataPoints);

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(analyticsService.computeTeamAlignmentTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(trend);
        when(analyticsService.computeTeamCompletionTrend(eq(orgId), eq(managerId), eq(12)))
                .thenReturn(List.of());
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        DriftReport report = driftDetectionService.detectDrift(orgId);

        assertThat(report.signals()).hasSize(1);
        assertThat(report.signals().get(0).severity()).isEqualTo(DriftSeverity.SUSTAINED);
    }

    @Test
    void detectDrift_noManagersInOrg_returnsEmptyReport() {
        // Only EMPLOYEEs — no managers to iterate
        AppUser employee = new AppUser(org, "emp@example.com", "Alice", UserRole.EMPLOYEE, manager);
        employee.setId(UUID.randomUUID());

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(employee));
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        DriftReport report = driftDetectionService.detectDrift(orgId);

        assertThat(report.signals()).isEmpty();
    }

    @Test
    void detectDrift_createsDefaultConfigWhenNoneExists() {
        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.empty());
        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(configRepository.save(any(ObservatoryConfig.class))).thenReturn(defaultConfig);
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of());
        when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(orgId))
                .thenReturn(List.of());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId)).thenReturn(List.of());

        DriftReport report = driftDetectionService.detectDrift(orgId);

        assertThat(report).isNotNull();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // detectSignalIntegrity — UNIFORM_CATEGORIZATION
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void detectSignalIntegrity_uniformCategorization_flaggedWhen95PercentStrategic() {
        UUID cycleId = UUID.randomUUID();
        ChessCategory strategicCat = chessCat("Strategic");

        // 19 strategic, 1 other = 95% — exceeds the 90% threshold
        List<Commitment> teamCommitments = commitments(manager, strategicCat, 19);
        teamCommitments.addAll(commitments(manager, chessCat("Operational"), 1));

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(userRepository.findSubtreeUserIds(managerId)).thenReturn(List.of());
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(cycleId)))
                .thenReturn(teamCommitments);
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId))
                .thenReturn(List.of());

        IntegrityReport report = driftDetectionService.detectSignalIntegrity(orgId, cycleId);

        assertThat(report.flags()).hasSize(1);
        IntegrityFlag flag = report.flags().get(0);
        assertThat(flag.type()).isEqualTo(IntegrityFlagType.UNIFORM_CATEGORIZATION);
        assertThat(flag.userId()).isEqualTo(managerId);
        assertThat(flag.details()).containsKey("dominantCategory");
        assertThat(flag.details().get("dominantCategory")).isEqualTo("Strategic");
    }

    @Test
    void detectSignalIntegrity_uniformCategorization_notFlaggedWhen89Percent() {
        UUID cycleId = UUID.randomUUID();
        ChessCategory strategicCat = chessCat("Strategic");

        // 89 strategic, 11 other = 89% — below the 90% threshold
        List<Commitment> teamCommitments = commitments(manager, strategicCat, 89);
        teamCommitments.addAll(commitments(manager, chessCat("Operational"), 11));

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(userRepository.findSubtreeUserIds(managerId)).thenReturn(List.of());
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(cycleId)))
                .thenReturn(teamCommitments);
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId))
                .thenReturn(List.of());

        IntegrityReport report = driftDetectionService.detectSignalIntegrity(orgId, cycleId);

        List<IntegrityFlag> uniformFlags = report.flags().stream()
                .filter(f -> f.type() == IntegrityFlagType.UNIFORM_CATEGORIZATION)
                .toList();
        assertThat(uniformFlags).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // detectSignalIntegrity — COMPLETION_MISMATCH
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void detectSignalIntegrity_completionMismatch_flaggedWhenManagerAndTeamDivergeBy30pp() {
        UUID cycleId = UUID.randomUUID();
        UUID reportId = UUID.randomUUID();

        AppUser report1 = new AppUser(org, "r1@example.com", "Report One", UserRole.EMPLOYEE, manager);
        report1.setId(reportId);

        ChessCategory strategic = chessCat("Strategic");
        ChessCategory operational = chessCat("Operational");

        // Manager: 3 strategic, 0 operational = 100% strategic
        List<Commitment> managerCommitments = commitments(manager, strategic, 3);

        // Team: 0 strategic, 5 operational = 0% strategic → divergence 100pp
        List<Commitment> teamCommitments = commitments(report1, operational, 5);

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(userRepository.findSubtreeUserIds(managerId)).thenReturn(List.of(reportId));

        // First call (allUserIds including manager) → team+manager commitments for uniform check
        // Second call (List.of(managerId)) → manager own commitments for mismatch check
        // Third call (teamUserIds) → report commitments for mismatch check
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(cycleId)))
                .thenAnswer(inv -> {
                    Collection<UUID> ids = inv.getArgument(0);
                    if (ids.contains(managerId) && ids.contains(reportId)) {
                        // allUserIds call (uniform categorization pass)
                        List<Commitment> all = new java.util.ArrayList<>(managerCommitments);
                        all.addAll(teamCommitments);
                        return all;
                    } else if (ids.contains(managerId) && !ids.contains(reportId)) {
                        return managerCommitments;
                    } else {
                        return teamCommitments;
                    }
                });
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId))
                .thenReturn(List.of());

        IntegrityReport report = driftDetectionService.detectSignalIntegrity(orgId, cycleId);

        List<IntegrityFlag> mismatchFlags = report.flags().stream()
                .filter(f -> f.type() == IntegrityFlagType.COMPLETION_MISMATCH)
                .toList();
        assertThat(mismatchFlags).hasSize(1);
        assertThat(mismatchFlags.get(0).userId()).isEqualTo(managerId);
        assertThat(mismatchFlags.get(0).details()).containsKey("divergencePoints");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // detectSignalIntegrity — DUPLICATE_NOTES
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    void detectSignalIntegrity_duplicateNotes_flaggedWhenSameNoteUsedThreeTimes() {
        UUID cycleId = UUID.randomUUID();

        // Manager has 3 reconciliation records with the same note (after lowercase/trim)
        ReconciliationRecord r1 = reconciliationRecord(manager, "Blocked by vendor");
        ReconciliationRecord r2 = reconciliationRecord(manager, "Blocked by vendor");
        ReconciliationRecord r3 = reconciliationRecord(manager, "blocked by vendor "); // trailing space — same after trim

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(userRepository.findSubtreeUserIds(managerId)).thenReturn(List.of());
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(cycleId)))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId))
                .thenReturn(List.of(r1, r2, r3));

        IntegrityReport report = driftDetectionService.detectSignalIntegrity(orgId, cycleId);

        List<IntegrityFlag> dupFlags = report.flags().stream()
                .filter(f -> f.type() == IntegrityFlagType.DUPLICATE_NOTES)
                .toList();
        assertThat(dupFlags).hasSize(1);
        assertThat(dupFlags.get(0).userId()).isEqualTo(managerId);
    }

    @Test
    void detectSignalIntegrity_duplicateNotes_notFlaggedWhenEachNoteIsUnique() {
        UUID cycleId = UUID.randomUUID();

        ReconciliationRecord r1 = reconciliationRecord(manager, "Blocked by vendor");
        ReconciliationRecord r2 = reconciliationRecord(manager, "Scope changed");
        ReconciliationRecord r3 = reconciliationRecord(manager, "Capacity issue");

        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(defaultConfig));
        when(userRepository.findByOrgIdAndIsActiveTrue(orgId)).thenReturn(List.of(manager));
        when(userRepository.findSubtreeUserIds(managerId)).thenReturn(List.of());
        when(commitmentRepository.findByUserIdInAndCycleId(any(Collection.class), eq(cycleId)))
                .thenReturn(List.of());
        when(reconciliationRecordRepository.findByOrgIdAndCycleId(orgId, cycleId))
                .thenReturn(List.of(r1, r2, r3));

        IntegrityReport report = driftDetectionService.detectSignalIntegrity(orgId, cycleId);

        List<IntegrityFlag> dupFlags = report.flags().stream()
                .filter(f -> f.type() == IntegrityFlagType.DUPLICATE_NOTES)
                .toList();
        assertThat(dupFlags).isEmpty();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test helpers
    // ─────────────────────────────────────────────────────────────────────────

    private AlignmentDataPoint alignmentPoint(double strategicPct, int weekOffset) {
        return new AlignmentDataPoint(
                UUID.randomUUID(),
                "Week " + weekOffset,
                Instant.now().minusSeconds(weekOffset * 604800L),
                strategicPct,
                0.0, 0.0, 0.0, 0.0, 10
        );
    }

    private ChessCategory chessCat(String name) {
        ChessCategory cat = ChessCategory.builder()
                .org(org)
                .name(name)
                .sortOrder(0)
                .isActive(true)
                .build();
        cat.setId(UUID.randomUUID());
        return cat;
    }

    private List<Commitment> commitments(AppUser user, ChessCategory category, int count) {
        List<Commitment> result = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            Commitment c = new Commitment(org, user, null, "Commitment " + i,
                    CompletionHorizon.EOW);
            c.setId(UUID.randomUUID());
            c.setChessCategory(category);
            result.add(c);
        }
        return result;
    }

    private ReconciliationRecord reconciliationRecord(AppUser user, String notes) {
        Commitment commitment = new Commitment(org, user, null, "Some commitment",
                CompletionHorizon.EOW);
        commitment.setId(UUID.randomUUID());

        ReconciliationRecord r = new ReconciliationRecord(
                org, commitment, null,
                ReconciliationStatus.COMPLETED,
                Instant.now(), user
        );
        r.setId(UUID.randomUUID());
        r.setNotes(notes);
        return r;
    }
}
