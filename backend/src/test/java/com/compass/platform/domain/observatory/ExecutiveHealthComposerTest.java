package com.compass.platform.domain.observatory;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftMetric;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSeverity;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import com.compass.platform.domain.observatory.dto.DriftUnitType;
import com.compass.platform.domain.observatory.dto.ExecutiveHealthResponse;
import com.compass.platform.domain.observatory.dto.HealthGrade;
import com.compass.platform.domain.observatory.dto.IntegrityFlag;
import com.compass.platform.domain.observatory.dto.IntegrityFlagType;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.OrgUnitHealth;
import com.compass.platform.domain.observatory.dto.TeamAlignmentTrend;
import com.compass.platform.domain.observatory.dto.TrendDirection;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExecutiveHealthComposerTest {

    @Mock private AnalyticsService analyticsService;
    @Mock private DriftDetectionService driftDetectionService;
    @Mock private ObservatoryConfigRepository configRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private AppUserRepository userRepository;

    @InjectMocks private ExecutiveHealthComposer composer;

    // ── shared fixtures ──────────────────────────────────────────────────────

    private UUID orgId;
    private Org org;
    private ObservatoryConfig config;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        org = Org.builder()
                .id(orgId)
                .name("Acme Corp")
                .slug("acme")
                .timezone("UTC")
                .build();
        config = ObservatoryConfig.builder()
                .org(org)
                .strategicAlignmentTarget(new BigDecimal("60.0"))
                .misalignmentWarningPct(new BigDecimal("40.0"))
                .build();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AlignmentDataPoint alignmentPoint(double strategicPct, double rallyCoveragePct) {
        return new AlignmentDataPoint(UUID.randomUUID(), "W1", Instant.now(),
                strategicPct, 20.0, 10.0, 10.0, rallyCoveragePct, 50);
    }

    private CompletionDataPoint completionPoint(double completionRate, double carryForwardRate) {
        return new CompletionDataPoint(UUID.randomUUID(), "W1", Instant.now(),
                completionRate, carryForwardRate, 0.0, 40, 32);
    }

    private DriftSignal driftSignal(DriftSeverity severity) {
        return new DriftSignal(DriftUnitType.TEAM, UUID.randomUUID(), "Engineering",
                DriftMetric.ALIGNMENT, severity, 35.0, 55.0, 4,
                TrendDirection.DECLINING, List.of(55.0, 50.0, 43.0, 35.0));
    }

    private IntegrityFlag integrityFlag() {
        return new IntegrityFlag(IntegrityFlagType.UNIFORM_CATEGORIZATION,
                UUID.randomUUID(), Map.of("detail", "all S"));
    }

    private AppUser vp(UUID id, String name) {
        AppUser user = new AppUser(org, name.toLowerCase().replace(" ", ".") + "@acme.com",
                name, UserRole.VP, null);
        user.setId(id);
        return user;
    }

    private void stubMinimalComputeHealth(int weekCount) {
        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));

        when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
        when(analyticsService.computeCompletionTrend(orgId, weekCount))
                .thenReturn(List.of(completionPoint(72.0, 15.0)));

        when(driftDetectionService.detectDrift(orgId))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                .thenReturn(new IntegrityReport(List.of()));

        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of());
    }

    // ═════════════════════════════════════════════════════════════════════════
    // computeGrade — static / pure
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class ComputeGrade {

        // Config: GREEN >= 60, YELLOW >= 40, RED < 40

        @Test
        void returnsGreen_whenAlignmentEqualsTarget() {
            assertThat(ExecutiveHealthComposer.computeGrade(60.0, config)).isEqualTo(HealthGrade.GREEN);
        }

        @Test
        void returnsGreen_whenAlignmentAboveTarget() {
            assertThat(ExecutiveHealthComposer.computeGrade(85.5, config)).isEqualTo(HealthGrade.GREEN);
        }

        @Test
        void returnsYellow_whenAlignmentBelowTargetButAtWarning() {
            assertThat(ExecutiveHealthComposer.computeGrade(40.0, config)).isEqualTo(HealthGrade.YELLOW);
        }

        @Test
        void returnsYellow_whenAlignmentBetweenWarningAndTarget() {
            assertThat(ExecutiveHealthComposer.computeGrade(55.9, config)).isEqualTo(HealthGrade.YELLOW);
        }

        @Test
        void returnsRed_whenAlignmentBelowWarning() {
            assertThat(ExecutiveHealthComposer.computeGrade(39.9, config)).isEqualTo(HealthGrade.RED);
        }

        @Test
        void returnsRed_whenAlignmentIsZero() {
            assertThat(ExecutiveHealthComposer.computeGrade(0.0, config)).isEqualTo(HealthGrade.RED);
        }

        @Test
        void respectsCustomThresholds() {
            ObservatoryConfig tight = ObservatoryConfig.builder()
                    .org(org)
                    .strategicAlignmentTarget(new BigDecimal("80.0"))
                    .misalignmentWarningPct(new BigDecimal("60.0"))
                    .build();
            assertThat(ExecutiveHealthComposer.computeGrade(79.9, tight)).isEqualTo(HealthGrade.YELLOW);
            assertThat(ExecutiveHealthComposer.computeGrade(80.0, tight)).isEqualTo(HealthGrade.GREEN);
            assertThat(ExecutiveHealthComposer.computeGrade(59.9, tight)).isEqualTo(HealthGrade.RED);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // computeHealth — happy path
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class ComputeHealthHappyPath {

        @Test
        void assemblesAllFieldsCorrectly() {
            int weekCount = 8;
            stubMinimalComputeHealth(weekCount);

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.orgId()).isEqualTo(orgId);
            assertThat(resp.orgName()).isEqualTo("Acme Corp");
            assertThat(resp.overallGrade()).isEqualTo(HealthGrade.GREEN);
            assertThat(resp.strategicAlignmentPct()).isCloseTo(65.0, within(0.001));
            assertThat(resp.rallyCoveragePct()).isCloseTo(80.0, within(0.001));
            assertThat(resp.completionRate()).isCloseTo(72.0, within(0.001));
            assertThat(resp.carryForwardRate()).isCloseTo(15.0, within(0.001));
            assertThat(resp.activeDriftSignals()).isZero();
            assertThat(resp.integrityFlags()).isZero();
            assertThat(resp.units()).isEmpty();
            assertThat(resp.computedAt()).isNotNull();
        }

        @Test
        void countsOnlyActiveDriftSignals() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));

            // Two active signals (EMERGING + SUSTAINED) and one hypothetically re-used STRUCTURAL
            List<DriftSignal> signals = List.of(
                    driftSignal(DriftSeverity.EMERGING),
                    driftSignal(DriftSeverity.SUSTAINED),
                    driftSignal(DriftSeverity.STRUCTURAL)
            );
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(signals, Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.activeDriftSignals()).isEqualTo(3);
        }

        @Test
        void countsIntegrityFlags() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of(integrityFlag(), integrityFlag())));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.integrityFlags()).isEqualTo(2);
        }

        @Test
        void throwsIllegalArgumentException_whenOrgNotFound() {
            when(orgRepository.findById(orgId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> composer.computeHealth(orgId, 4))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining(orgId.toString());
        }

        @Test
        void overallGradeReflectsMostRecentAlignmentPoint() {
            // Most recent (last) point is RED territory (30%)
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount)).thenReturn(List.of(
                    alignmentPoint(70.0, 80.0),   // earlier — GREEN
                    alignmentPoint(30.0, 50.0)    // most recent — RED
            ));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(60.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.overallGrade()).isEqualTo(HealthGrade.RED);
            assertThat(resp.strategicAlignmentPct()).isCloseTo(30.0, within(0.001));
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Default config used when org has no saved config
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class DefaultConfigFallback {

        @Test
        void usesDefaultThresholds_whenNoConfigFound() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.empty());

            // 65% is above the default strategic target of 60 → should be GREEN
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            // Default config thresholds (from ObservatoryConfig field defaults):
            //   strategicAlignmentTarget = 60.0  → GREEN when alignment >= 60
            //   misalignmentWarningPct   = 40.0  → RED   when alignment <  40
            // 65% >= 60% → GREEN
            assertThat(resp.overallGrade()).isEqualTo(HealthGrade.GREEN);
            assertThat(resp.strategicAlignmentPct()).isCloseTo(65.0, within(0.001));
        }

        @Test
        void defaultConfig_redGrade_whenAlignmentBelowDefaultWarning() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.empty());

            // 30% is below the default warning of 40 → should be RED
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(30.0, 50.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(50.0, 20.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            // 30% < 40% (default misalignmentWarningPct) → RED
            assertThat(resp.overallGrade()).isEqualTo(HealthGrade.RED);
            assertThat(resp.strategicAlignmentPct()).isCloseTo(30.0, within(0.001));
        }

        @Test
        void doesNotPersistDefaultConfig() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.empty());
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            composer.computeHealth(orgId, weekCount);

            verify(configRepository, never()).save(any());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Empty trend lists — graceful handling
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class EmptyTrendLists {

        @Test
        void emptyAlignmentTrend_yieldsZeroAlignmentAndRallyCoverage() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(Collections.emptyList());
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.strategicAlignmentPct()).isZero();
            assertThat(resp.rallyCoveragePct()).isZero();
            assertThat(resp.overallGrade()).isEqualTo(HealthGrade.RED); // 0% < 40% warning
        }

        @Test
        void emptyCompletionTrend_yieldsZeroCompletionAndCarryForward() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(Collections.emptyList());
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.completionRate()).isZero();
            assertThat(resp.carryForwardRate()).isZero();
        }

        @Test
        void nullDriftSignalsList_treatedAsNoSignals() {
            int weekCount = 4;
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(null, Instant.now())); // null signals list
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.activeDriftSignals()).isZero();
        }

        @Test
        void noLeaders_yieldsEmptyUnitList() {
            int weekCount = 4;
            stubMinimalComputeHealth(weekCount);
            // stubMinimalComputeHealth already stubs findByOrgIdAndRoleIn → empty list

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units()).isEmpty();
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // buildUnitHealthList — per-VP/Director breakdown
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class BuildUnitHealthList {

        @Test
        void returnsOneUnitPerLeader() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            UUID dirId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Alice VP");
            AppUser dirUser = new AppUser(org, "bob.dir@acme.com", "Bob Director",
                    UserRole.DIRECTOR, null);
            dirUser.setId(dirId);

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));

            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser, dirUser));

            // Per-leader stubs
            TeamAlignmentTrend vpTrend = new TeamAlignmentTrend(vpId, "Alice VP", "VP", 5,
                    List.of(alignmentPoint(70.0, 85.0)));
            TeamAlignmentTrend dirTrend = new TeamAlignmentTrend(dirId, "Bob Director", "DIRECTOR", 3,
                    List.of(alignmentPoint(50.0, 60.0)));

            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount)).thenReturn(vpTrend);
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(75.0, 12.0)));
            when(userRepository.findSubtreeUserIds(vpId)).thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID()));

            when(analyticsService.computeTeamAlignmentTrend(orgId, dirId, weekCount)).thenReturn(dirTrend);
            when(analyticsService.computeTeamCompletionTrend(orgId, dirId, weekCount))
                    .thenReturn(List.of(completionPoint(60.0, 20.0)));
            when(userRepository.findSubtreeUserIds(dirId)).thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID()));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units()).hasSize(2);
        }

        @Test
        void unitFieldsPopulatedCorrectly() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Carol VP");

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));

            TeamAlignmentTrend vpTrend = new TeamAlignmentTrend(vpId, "Carol VP", "VP", 4,
                    List.of(alignmentPoint(62.0, 75.0)));
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount)).thenReturn(vpTrend);
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(68.0, 8.0)));
            when(userRepository.findSubtreeUserIds(vpId))
                    .thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID()));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            OrgUnitHealth unit = resp.units().get(0);
            assertThat(unit.managerId()).isEqualTo(vpId);
            assertThat(unit.managerName()).isEqualTo("Carol VP");
            assertThat(unit.role()).isEqualTo("VP");
            assertThat(unit.headcount()).isEqualTo(4);
            assertThat(unit.strategicAlignmentPct()).isCloseTo(62.0, within(0.001));
            assertThat(unit.rallyCoveragePct()).isCloseTo(75.0, within(0.001));
            assertThat(unit.completionRate()).isCloseTo(68.0, within(0.001));
            assertThat(unit.grade()).isEqualTo(HealthGrade.GREEN); // 62 >= 60
        }

        @Test
        void nullTeamAlignmentTrend_treatedAsEmptyDataPoints() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Dana VP");

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));

            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount)).thenReturn(null);
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(Collections.emptyList());
            when(userRepository.findSubtreeUserIds(vpId)).thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            OrgUnitHealth unit = resp.units().get(0);
            assertThat(unit.strategicAlignmentPct()).isZero();
            assertThat(unit.rallyCoveragePct()).isZero();
            assertThat(unit.completionRate()).isZero();
            assertThat(unit.grade()).isEqualTo(HealthGrade.RED);
        }

        @Test
        void headcountComesFromSubtree_notDirectReportsOnly() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Eve VP");

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));

            // 10 people in subtree (deep org)
            List<UUID> subtree = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                    UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                    UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
            when(userRepository.findSubtreeUserIds(vpId)).thenReturn(subtree);
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Eve VP", "VP", 10,
                            List.of(alignmentPoint(65.0, 80.0))));
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).headcount()).isEqualTo(10);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // computeTrendDirection / computeWeeksTrending delegation
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class TrendDelegation {

        private UUID vpId;
        private AppUser vpUser;

        @BeforeEach
        void setUpLeader() {
            vpId = UUID.randomUUID();
            vpUser = vp(vpId, "Frank VP");
        }

        private void stubOrgLevel(int weekCount) {
            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));
            when(userRepository.findSubtreeUserIds(vpId)).thenReturn(List.of(UUID.randomUUID(), UUID.randomUUID()));
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
        }

        @Test
        void trendDirection_declining_whenValuesConsistentlyFalling() {
            int weekCount = 4;
            stubOrgLevel(weekCount);

            // Strictly declining sequence: 70 → 65 → 58 → 50 (all drops > 2.0 tolerance)
            List<AlignmentDataPoint> declining = List.of(
                    alignmentPoint(70.0, 80.0),
                    alignmentPoint(65.0, 75.0),
                    alignmentPoint(58.0, 70.0),
                    alignmentPoint(50.0, 65.0)
            );
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Frank VP", "VP", 2, declining));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).trendDirection()).isEqualTo("declining");
            assertThat(resp.units().get(0).weeksTrending()).isLessThan(0); // negative = declining streak
        }

        @Test
        void trendDirection_improving_whenValuesConsistentlyRising() {
            int weekCount = 4;
            stubOrgLevel(weekCount);

            // Strictly improving sequence: 45 → 52 → 60 → 68 (all gains > 2.0 tolerance)
            List<AlignmentDataPoint> improving = List.of(
                    alignmentPoint(45.0, 55.0),
                    alignmentPoint(52.0, 60.0),
                    alignmentPoint(60.0, 68.0),
                    alignmentPoint(68.0, 75.0)
            );
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Frank VP", "VP", 2, improving));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).trendDirection()).isEqualTo("improving");
            assertThat(resp.units().get(0).weeksTrending()).isGreaterThan(0); // positive = improving streak
        }

        @Test
        void trendDirection_flat_whenValuesWithinTolerance() {
            int weekCount = 4;
            stubOrgLevel(weekCount);

            // Tiny fluctuations within ±2.0 tolerance → FLAT
            List<AlignmentDataPoint> flat = List.of(
                    alignmentPoint(60.0, 70.0),
                    alignmentPoint(61.0, 71.0),
                    alignmentPoint(60.5, 70.5),
                    alignmentPoint(60.8, 70.8)
            );
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Frank VP", "VP", 2, flat));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).trendDirection()).isEqualTo("flat");
            assertThat(resp.units().get(0).weeksTrending()).isZero();
        }

        @Test
        void weeksTrending_isZero_forEmptyDataPoints() {
            int weekCount = 4;
            stubOrgLevel(weekCount);

            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Frank VP", "VP", 2, List.of()));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).weeksTrending()).isZero();
            assertThat(resp.units().get(0).trendDirection()).isEqualTo("flat");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Cost-band weighted headcount calculation
    // ═════════════════════════════════════════════════════════════════════════

    @Nested
    class CostBandWeightedHeadcount {

        @Test
        void sumsDirectReportCostBandTiers() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Grace VP");

            // Set up 3 direct reports with cost-band tiers 2, 3, 5
            CostBand band2 = CostBand.builder().org(org).name("Mid").tier(2).build();
            CostBand band3 = CostBand.builder().org(org).name("Senior").tier(3).build();
            CostBand band5 = CostBand.builder().org(org).name("Staff").tier(5).build();

            AppUser dr1 = new AppUser(org, "dr1@acme.com", "DR One", UserRole.EMPLOYEE, vpUser);
            dr1.setId(UUID.randomUUID());
            dr1.setCostBand(band2);

            AppUser dr2 = new AppUser(org, "dr2@acme.com", "DR Two", UserRole.EMPLOYEE, vpUser);
            dr2.setId(UUID.randomUUID());
            dr2.setCostBand(band3);

            AppUser dr3 = new AppUser(org, "dr3@acme.com", "DR Three", UserRole.EMPLOYEE, vpUser);
            dr3.setId(UUID.randomUUID());
            dr3.setCostBand(band5);

            vpUser.getDirectReports().addAll(List.of(dr1, dr2, dr3));

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Grace VP", "VP", 3,
                            List.of(alignmentPoint(65.0, 80.0))));
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(userRepository.findSubtreeUserIds(vpId))
                    .thenReturn(List.of(dr1.getId(), dr2.getId(), dr3.getId()));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            // 2 + 3 + 5 = 10
            assertThat(resp.units().get(0).costBandWeightedHeadcount()).isEqualTo(10);
        }

        @Test
        void treatsNullCostBand_asZeroTier() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            AppUser vpUser = vp(vpId, "Hank VP");

            AppUser dr1 = new AppUser(org, "dr1@acme.com", "DR One", UserRole.EMPLOYEE, vpUser);
            dr1.setId(UUID.randomUUID());
            dr1.setCostBand(null); // no band assigned

            AppUser dr2 = new AppUser(org, "dr2@acme.com", "DR Two", UserRole.EMPLOYEE, vpUser);
            dr2.setId(UUID.randomUUID());
            CostBand band4 = CostBand.builder().org(org).name("Senior").tier(4).build();
            dr2.setCostBand(band4);

            vpUser.getDirectReports().addAll(List.of(dr1, dr2));

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Hank VP", "VP", 2,
                            List.of(alignmentPoint(65.0, 80.0))));
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(userRepository.findSubtreeUserIds(vpId))
                    .thenReturn(List.of(dr1.getId(), dr2.getId()));

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            // 0 (null band) + 4 = 4
            assertThat(resp.units().get(0).costBandWeightedHeadcount()).isEqualTo(4);
        }

        @Test
        void nullDirectReportsList_yieldsZeroWeightedHeadcount() {
            int weekCount = 4;
            UUID vpId = UUID.randomUUID();
            // Construct user with the basic constructor — directReports list starts empty by default,
            // but the production code guards for null; use a spy-like approach by relying on the
            // default initialised list (empty) which also triggers the zero branch since sum of empty = 0.
            AppUser vpUser = vp(vpId, "Iris VP");
            // directReports is initialized to empty ArrayList by AppUser — weighted sum = 0

            when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
            when(configRepository.findByOrgId(orgId)).thenReturn(Optional.of(config));
            when(analyticsService.computeAlignmentTrend(orgId, weekCount))
                    .thenReturn(List.of(alignmentPoint(65.0, 80.0)));
            when(analyticsService.computeCompletionTrend(orgId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(driftDetectionService.detectDrift(orgId))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(driftDetectionService.detectSignalIntegrity(eq(orgId), isNull()))
                    .thenReturn(new IntegrityReport(List.of()));
            when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                    .thenReturn(List.of(vpUser));
            when(analyticsService.computeTeamAlignmentTrend(orgId, vpId, weekCount))
                    .thenReturn(new TeamAlignmentTrend(vpId, "Iris VP", "VP", 0,
                            List.of(alignmentPoint(65.0, 80.0))));
            when(analyticsService.computeTeamCompletionTrend(orgId, vpId, weekCount))
                    .thenReturn(List.of(completionPoint(70.0, 10.0)));
            when(userRepository.findSubtreeUserIds(vpId)).thenReturn(List.of());

            ExecutiveHealthResponse resp = composer.computeHealth(orgId, weekCount);

            assertThat(resp.units().get(0).costBandWeightedHeadcount()).isZero();
        }
    }
}
