package com.compass.platform.domain.observatory;

import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.ExecutiveHealthResponse;
import com.compass.platform.domain.observatory.dto.HealthGrade;
import com.compass.platform.domain.observatory.dto.PortcoSummary;
import com.compass.platform.domain.observatory.dto.PortcoTrendLine;
import com.compass.platform.domain.observatory.dto.PortfolioComparisonResponse;
import com.compass.platform.domain.observatory.dto.PortfolioHealthResponse;
import com.compass.platform.domain.observatory.dto.TimeScope;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PortfolioServiceTest {

    @Mock private PortfolioRepository portfolioRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private ExecutiveHealthComposer healthComposer;
    @Mock private AnalyticsService analyticsService;
    @Mock private RallyCryRepository rallyCryRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private CycleRepository cycleRepository;
    @InjectMocks private PortfolioService portfolioService;

    private static final int DEFAULT_WEEK_COUNT = 12;

    private UUID portfolioId;
    private Portfolio portfolio;

    private UUID orgAId;
    private UUID orgBId;
    private Org orgA;
    private Org orgB;

    @BeforeEach
    void setUp() {
        portfolioId = UUID.randomUUID();
        portfolio = Portfolio.builder()
                .name("Apex Fund I")
                .slug("apex-fund-i")
                .description("Primary PE portfolio")
                .build();
        portfolio.setId(portfolioId);

        orgAId = UUID.randomUUID();
        orgA = Org.builder()
                .id(orgAId)
                .name("Alpha Corp")
                .slug("alpha-corp")
                .timezone("UTC")
                .isActive(true)
                .build();

        orgBId = UUID.randomUUID();
        orgB = Org.builder()
                .id(orgBId)
                .name("Beta Inc")
                .slug("beta-inc")
                .timezone("America/New_York")
                .isActive(true)
                .build();

        // Default: no active rally cries — buildRallyCrySummaries returns List.of() early.
        // Lenient because comparison tests and not-found tests never reach this code path.
        lenient().when(rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(any(UUID.class)))
                .thenReturn(List.of());
    }

    // -------------------------------------------------------------------------
    // getPortfolioHealth — happy path with multiple orgs
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioHealth_happyPath_returnsOnePortcoSummaryPerOrg() {
        ExecutiveHealthResponse healthA = buildHealth(orgAId, "Alpha Corp",
                HealthGrade.GREEN, 0.82, 0.90, 0.75, 0.10, 1);
        ExecutiveHealthResponse healthB = buildHealth(orgBId, "Beta Inc",
                HealthGrade.YELLOW, 0.65, 0.70, 0.60, 0.20, 3);

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA, orgB));
        when(healthComposer.computeHealth(eq(orgAId), any(TimeScope.class))).thenReturn(healthA);
        when(healthComposer.computeHealth(eq(orgBId), any(TimeScope.class))).thenReturn(healthB);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgAId)).thenReturn(42L);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgBId)).thenReturn(17L);

        PortfolioHealthResponse response = portfolioService.getPortfolioHealth(portfolioId);

        assertThat(response.portfolioId()).isEqualTo(portfolioId);
        assertThat(response.portfolioName()).isEqualTo("Apex Fund I");
        assertThat(response.computedAt()).isNotNull();
        assertThat(response.portcos()).hasSize(2);

        PortcoSummary summaryA = response.portcos().get(0);
        assertThat(summaryA.orgId()).isEqualTo(orgAId);
        assertThat(summaryA.orgName()).isEqualTo("Alpha Corp");

        PortcoSummary summaryB = response.portcos().get(1);
        assertThat(summaryB.orgId()).isEqualTo(orgBId);
        assertThat(summaryB.orgName()).isEqualTo("Beta Inc");
    }

    @Test
    void getPortfolioHealth_happyPath_usesDefaultTwelveWeekWindow() {
        ExecutiveHealthResponse health = buildHealth(orgAId, "Alpha Corp",
                HealthGrade.GREEN, 0.80, 0.85, 0.70, 0.05, 0);

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA));
        when(healthComposer.computeHealth(eq(orgAId), any(TimeScope.class))).thenReturn(health);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgAId)).thenReturn(10L);

        portfolioService.getPortfolioHealth(portfolioId);

        verify(healthComposer).computeHealth(eq(orgAId), any(TimeScope.class));
    }

    // -------------------------------------------------------------------------
    // getPortfolioHealth — portfolio not found
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioHealth_portfolioNotFound_throwsEntityNotFoundException() {
        UUID missingId = UUID.randomUUID();
        when(portfolioRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.getPortfolioHealth(missingId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining(missingId.toString());

        verifyNoInteractions(orgRepository, healthComposer, appUserRepository);
    }

    // -------------------------------------------------------------------------
    // getPortfolioHealth — empty org list
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioHealth_emptyOrgList_returnsZeroPortcos() {
        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of());

        PortfolioHealthResponse response = portfolioService.getPortfolioHealth(portfolioId);

        assertThat(response.portfolioId()).isEqualTo(portfolioId);
        assertThat(response.portcos()).isEmpty();
        verifyNoInteractions(healthComposer, appUserRepository);
    }

    // -------------------------------------------------------------------------
    // getPortfolioHealth — PortcoSummary fields assembled from correct sub-results
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioHealth_portcoSummaryFieldsAssembledCorrectly() {
        HealthGrade expectedGrade       = HealthGrade.RED;
        double expectedStrategicPct     = 0.42;
        double expectedRallyCovPct      = 0.55;
        double expectedCompletionRate   = 0.38;
        double expectedCarryForwardRate = 0.31;
        int    expectedDriftSignals     = 7;
        long   expectedHeadcount        = 99L;

        ExecutiveHealthResponse health = buildHealth(
                orgAId, "Alpha Corp",
                expectedGrade,
                expectedStrategicPct,
                expectedRallyCovPct,
                expectedCompletionRate,
                expectedCarryForwardRate,
                expectedDriftSignals);

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA));
        when(healthComposer.computeHealth(eq(orgAId), any(TimeScope.class))).thenReturn(health);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgAId)).thenReturn(expectedHeadcount);

        PortfolioHealthResponse response = portfolioService.getPortfolioHealth(portfolioId);

        PortcoSummary summary = response.portcos().get(0);
        assertThat(summary.orgId()).isEqualTo(orgAId);
        assertThat(summary.orgName()).isEqualTo("Alpha Corp");
        assertThat(summary.overallGrade()).isEqualTo(expectedGrade);
        assertThat(summary.strategicAlignmentPct()).isEqualTo(expectedStrategicPct);
        assertThat(summary.rallyCoveragePct()).isEqualTo(expectedRallyCovPct);
        assertThat(summary.completionRate()).isEqualTo(expectedCompletionRate);
        assertThat(summary.carryForwardRate()).isEqualTo(expectedCarryForwardRate);
        assertThat(summary.activeDriftSignals()).isEqualTo(expectedDriftSignals);
        assertThat(summary.headcount()).isEqualTo(expectedHeadcount);
    }

    @Test
    void getPortfolioHealth_headcountSourcedFromUserRepository_notHealthComposer() {
        ExecutiveHealthResponse health = buildHealth(orgAId, "Alpha Corp",
                HealthGrade.GREEN, 0.80, 0.85, 0.70, 0.05, 0);

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA));
        when(healthComposer.computeHealth(eq(orgAId), any(TimeScope.class))).thenReturn(health);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgAId)).thenReturn(55L);

        PortfolioHealthResponse response = portfolioService.getPortfolioHealth(portfolioId);

        // Headcount must come from the user repo, not any value inside ExecutiveHealthResponse
        verify(appUserRepository).countByOrgIdAndIsActiveTrue(orgAId);
        assertThat(response.portcos().get(0).headcount()).isEqualTo(55L);
    }

    // -------------------------------------------------------------------------
    // getPortfolioComparison — sparklines per portco
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioComparison_happyPath_returnsOneTrendLinePerOrg() {
        int weekCount = 8;
        List<AlignmentDataPoint> pointsA = List.of(
                buildDataPoint(0.80), buildDataPoint(0.82), buildDataPoint(0.79));
        List<AlignmentDataPoint> pointsB = List.of(
                buildDataPoint(0.60), buildDataPoint(0.63));

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA, orgB));
        when(analyticsService.computeAlignmentTrend(eq(orgAId), any(TimeScope.class))).thenReturn(pointsA);
        when(analyticsService.computeAlignmentTrend(eq(orgBId), any(TimeScope.class))).thenReturn(pointsB);

        PortfolioComparisonResponse response =
                portfolioService.getPortfolioComparison(portfolioId, TimeScope.ofWeeks(weekCount));

        assertThat(response.portfolioId()).isEqualTo(portfolioId);
        assertThat(response.portfolioName()).isEqualTo("Apex Fund I");
        assertThat(response.trends()).hasSize(2);

        PortcoTrendLine trendA = response.trends().get(0);
        assertThat(trendA.orgId()).isEqualTo(orgAId);
        assertThat(trendA.orgName()).isEqualTo("Alpha Corp");
        assertThat(trendA.dataPoints()).hasSize(3);

        PortcoTrendLine trendB = response.trends().get(1);
        assertThat(trendB.orgId()).isEqualTo(orgBId);
        assertThat(trendB.orgName()).isEqualTo("Beta Inc");
        assertThat(trendB.dataPoints()).hasSize(2);
    }

    @Test
    void getPortfolioComparison_forwardsWeekCountToAnalyticsService() {
        int customWeekCount = 26;
        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA));
        when(analyticsService.computeAlignmentTrend(eq(orgAId), any(TimeScope.class)))
                .thenReturn(List.of());

        portfolioService.getPortfolioComparison(portfolioId, TimeScope.ofWeeks(customWeekCount));

        verify(analyticsService).computeAlignmentTrend(eq(orgAId), any(TimeScope.class));
    }

    @Test
    void getPortfolioComparison_portfolioNotFound_throwsEntityNotFoundException() {
        UUID missingId = UUID.randomUUID();
        when(portfolioRepository.findById(missingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioService.getPortfolioComparison(missingId, TimeScope.ofWeeks(8)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining(missingId.toString());

        verifyNoInteractions(orgRepository, analyticsService);
    }

    @Test
    void getPortfolioComparison_emptyOrgList_returnsEmptyTrends() {
        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of());

        PortfolioComparisonResponse response =
                portfolioService.getPortfolioComparison(portfolioId, TimeScope.ofWeeks(12));

        assertThat(response.trends()).isEmpty();
        verifyNoInteractions(analyticsService);
    }

    // -------------------------------------------------------------------------
    // Headcount correctly pulled from user repository (cross-cutting)
    // -------------------------------------------------------------------------

    @Test
    void getPortfolioHealth_headcountQueriedPerOrg_notBatched() {
        ExecutiveHealthResponse healthA = buildHealth(orgAId, "Alpha Corp",
                HealthGrade.GREEN, 0.80, 0.85, 0.70, 0.05, 0);
        ExecutiveHealthResponse healthB = buildHealth(orgBId, "Beta Inc",
                HealthGrade.YELLOW, 0.60, 0.65, 0.55, 0.15, 2);

        when(portfolioRepository.findById(portfolioId)).thenReturn(Optional.of(portfolio));
        when(orgRepository.findByPortfolioId(portfolioId)).thenReturn(List.of(orgA, orgB));
        when(healthComposer.computeHealth(eq(orgAId), any(TimeScope.class))).thenReturn(healthA);
        when(healthComposer.computeHealth(eq(orgBId), any(TimeScope.class))).thenReturn(healthB);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgAId)).thenReturn(100L);
        when(appUserRepository.countByOrgIdAndIsActiveTrue(orgBId)).thenReturn(250L);

        PortfolioHealthResponse response = portfolioService.getPortfolioHealth(portfolioId);

        // Each org receives its own independently queried headcount
        verify(appUserRepository).countByOrgIdAndIsActiveTrue(orgAId);
        verify(appUserRepository).countByOrgIdAndIsActiveTrue(orgBId);
        assertThat(response.portcos().get(0).headcount()).isEqualTo(100L);
        assertThat(response.portcos().get(1).headcount()).isEqualTo(250L);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private ExecutiveHealthResponse buildHealth(UUID orgId,
                                                String orgName,
                                                HealthGrade grade,
                                                double strategicPct,
                                                double rallyCovPct,
                                                double completionRate,
                                                double carryForwardRate,
                                                int driftSignals) {
        return new ExecutiveHealthResponse(
                orgId,
                orgName,
                grade,
                strategicPct,
                rallyCovPct,
                completionRate,
                carryForwardRate,
                driftSignals,
                0,          // integrityFlags — not surfaced in PortcoSummary
                List.of(),  // units — not surfaced in PortcoSummary
                Instant.now()
        );
    }

    private AlignmentDataPoint buildDataPoint(double strategicPct) {
        return new AlignmentDataPoint(
                UUID.randomUUID(),
                "Week X",
                Instant.now(),
                strategicPct,
                0.20,  // operationalPct
                0.10,  // defensivePct
                0.05,  // capabilityBuildingPct
                0.75,  // rallyCoveragePct
                40     // totalCommitments
        );
    }
}
