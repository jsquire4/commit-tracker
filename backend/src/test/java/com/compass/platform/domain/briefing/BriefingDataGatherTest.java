package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.BriefingDataGatherer.BriefingDataContext;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.observatory.AnalyticsService;
import com.compass.platform.domain.observatory.DriftDetectionService;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.TimeScope;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftMetric;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.DriftSeverity;
import com.compass.platform.domain.observatory.dto.DriftSignal;
import com.compass.platform.domain.observatory.dto.DriftUnitType;
import com.compass.platform.domain.observatory.dto.TrendDirection;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
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
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BriefingDataGatherTest {

    @Mock private AnalyticsService analyticsService;
    @Mock private DriftDetectionService driftDetectionService;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private OrgRepository orgRepository;

    @InjectMocks private BriefingDataGatherer gatherer;

    private UUID orgId;
    private UUID cycleId;
    private Org org;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        cycleId = UUID.randomUUID();
        org = Org.builder()
                .id(orgId)
                .name("Acme Corp")
                .slug("acme-corp")
                .timezone("UTC")
                .build();
    }

    // -------------------------------------------------------------------------
    // 1. Happy path — all data present, reference data map keys populated
    // -------------------------------------------------------------------------

    @Test
    void gatherData_happyPath_populatesAllReferenceDataKeys() {
        AlignmentDataPoint prevAlignment = new AlignmentDataPoint(
                cycleId, "Week 11", Instant.now(), 30.0, 25.0, 10.0, 15.0, 60.0, 40);
        AlignmentDataPoint latestAlignment = new AlignmentDataPoint(
                cycleId, "Week 12", Instant.now(), 40.0, 20.0, 15.0, 10.0, 70.0, 50);

        CompletionDataPoint prevCompletion = new CompletionDataPoint(
                cycleId, "Week 11", Instant.now(), 55.0, 20.0, 10.0, 40, 22);
        CompletionDataPoint latestCompletion = new CompletionDataPoint(
                cycleId, "Week 12", Instant.now(), 65.0, 15.0, 8.0, 50, 32);

        DriftSignal signal = new DriftSignal(
                DriftUnitType.TEAM, UUID.randomUUID(), "Alpha Team",
                DriftMetric.ALIGNMENT, DriftSeverity.SUSTAINED,
                38.0, 45.0, 3, TrendDirection.DECLINING, List.of(45.0, 42.0, 38.0));
        DriftReport driftReport = new DriftReport(List.of(signal), Instant.now());

        Commitment linked = commitment(true);
        Commitment unlinked = commitment(false);

        when(analyticsService.computeAlignmentTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(prevAlignment, latestAlignment));
        when(analyticsService.computeCompletionTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(prevCompletion, latestCompletion));
        when(driftDetectionService.detectDrift(eq(orgId))).thenReturn(driftReport);
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of(linked, unlinked));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        // Reference data map contains all expected keys
        assertThat(ctx.referenceData()).containsKeys(
                "A.strategic", "A.operational", "A.defensive", "A.capability",
                "A.uncategorized", "A.prev_strategic", "A.delta",
                "E.completion", "E.carry_forward", "E.not_started",
                "E.prev_completion", "E.prev_carry_forward",
                "R.coverage", "R.unlinked",
                "D.count", "T.total"
        );

        // Spot-check values from the latest alignment point
        assertThat(ctx.referenceData().get("A.strategic")).isEqualTo(40.0);
        assertThat(ctx.referenceData().get("A.prev_strategic")).isEqualTo(30.0);
        assertThat(ctx.referenceData().get("A.delta")).isCloseTo(10.0, within(0.001));

        // Completion fields
        assertThat(ctx.referenceData().get("E.completion")).isEqualTo(65.0);
        assertThat(ctx.referenceData().get("E.prev_completion")).isEqualTo(55.0);

        // Drift count
        assertThat(ctx.referenceData().get("D.count")).isEqualTo(1.0);

        // Scalar fields on the context record
        assertThat(ctx.alignmentPct()).isEqualTo(40.0);
        assertThat(ctx.completionRate()).isEqualTo(65.0);
        assertThat(ctx.carryForwardRate()).isEqualTo(15.0);
        assertThat(ctx.driftCount()).isEqualTo(1);
        assertThat(ctx.totalCommitments()).isEqualTo(50);
    }

    @Test
    void gatherData_happyPath_userPromptContainsOrgNameAndSectionHeaders() {
        stubMinimalHappyPath();

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.userPrompt())
                .contains("Acme Corp")
                .contains("ALIGNMENT:")
                .contains("EXECUTION:")
                .contains("RALLY CRY COVERAGE:")
                .contains("DRIFT SIGNALS:");
    }

    // -------------------------------------------------------------------------
    // 2. Null cycleId — coverage = 0%, commitmentRepository never called
    // -------------------------------------------------------------------------

    @Test
    void gatherData_nullCycleId_rallyCryCoverageIsZeroAndRepoNotCalled() {
        AlignmentDataPoint alignment = new AlignmentDataPoint(
                UUID.randomUUID(), "Week 1", Instant.now(), 50.0, 20.0, 10.0, 10.0, 0.0, 10);
        CompletionDataPoint completion = new CompletionDataPoint(
                UUID.randomUUID(), "Week 1", Instant.now(), 70.0, 10.0, 5.0, 10, 7);

        when(analyticsService.computeAlignmentTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(alignment));
        when(analyticsService.computeCompletionTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(completion));
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, null);

        assertThat(ctx.rallyCryCoveragePct()).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("R.coverage")).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("R.unlinked")).isEqualTo(0.0);

        verifyNoInteractions(commitmentRepository);
    }

    // -------------------------------------------------------------------------
    // 3. Empty trend lists — all metrics default to 0
    // -------------------------------------------------------------------------

    @Test
    void gatherData_emptyTrends_allMetricsDefaultToZero() {
        when(analyticsService.computeAlignmentTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of());
        when(analyticsService.computeCompletionTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of());
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.alignmentPct()).isEqualTo(0.0);
        assertThat(ctx.completionRate()).isEqualTo(0.0);
        assertThat(ctx.carryForwardRate()).isEqualTo(0.0);
        assertThat(ctx.driftCount()).isEqualTo(0);
        assertThat(ctx.totalCommitments()).isEqualTo(0);
        assertThat(ctx.rallyCryCoveragePct()).isEqualTo(0.0);

        // Uncategorized should be 100 when all category pcts are 0
        assertThat(ctx.referenceData().get("A.uncategorized")).isEqualTo(100.0);

        // Prev values should fall back to current (which is 0)
        assertThat(ctx.referenceData().get("A.prev_strategic")).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("A.delta")).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("E.prev_completion")).isEqualTo(0.0);
    }

    // -------------------------------------------------------------------------
    // 4. Rally cry coverage calculation
    // -------------------------------------------------------------------------

    @Test
    void gatherData_rallyCryCoverage_calculatesLinkedFraction() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        // 3 linked, 2 unlinked → 60 %
        List<Commitment> commitments = List.of(
                commitment(true), commitment(true), commitment(true),
                commitment(false), commitment(false));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(commitments);

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.rallyCryCoveragePct()).isCloseTo(60.0, within(0.001));
        assertThat(ctx.referenceData().get("R.coverage")).isCloseTo(60.0, within(0.001));
        assertThat(ctx.referenceData().get("R.unlinked")).isEqualTo(2.0);
    }

    @Test
    void gatherData_rallyCryCoverage_allLinked_returns100Pct() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        List<Commitment> commitments = List.of(commitment(true), commitment(true));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(commitments);

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.rallyCryCoveragePct()).isCloseTo(100.0, within(0.001));
        assertThat(ctx.referenceData().get("R.unlinked")).isEqualTo(0.0);
    }

    @Test
    void gatherData_rallyCryCoverage_noneLinked_returns0Pct() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        List<Commitment> commitments = List.of(commitment(false), commitment(false));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(commitments);

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.rallyCryCoveragePct()).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("R.unlinked")).isEqualTo(2.0);
    }

    @Test
    void gatherData_rallyCryCoverage_emptyCycleCommitments_returns0Pct() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.rallyCryCoveragePct()).isEqualTo(0.0);
    }

    // -------------------------------------------------------------------------
    // 5. Org name populated from repository
    // -------------------------------------------------------------------------

    @Test
    void gatherData_orgFound_orgNameAppearsInPrompt() {
        stubMinimalHappyPath();

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.userPrompt()).contains("Acme Corp");
        verify(orgRepository).findById(orgId);
    }

    @Test
    void gatherData_orgNotFound_fallsBackToDefaultOrgName() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.empty());

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.userPrompt()).contains("Organization");
    }

    // -------------------------------------------------------------------------
    // 6. Drift report with signals appears in prompt
    // -------------------------------------------------------------------------

    @Test
    void gatherData_driftSignalsPresent_promptContainsSignalDetails() {
        stubAlignmentAndCompletion();
        DriftSignal signal = new DriftSignal(
                DriftUnitType.TEAM, UUID.randomUUID(), "Beta Team",
                DriftMetric.VELOCITY, DriftSeverity.STRUCTURAL,
                20.0, 50.0, 5, TrendDirection.DECLINING, List.of(50.0, 40.0, 30.0, 25.0, 20.0));
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(signal), Instant.now()));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.driftCount()).isEqualTo(1);
        assertThat(ctx.referenceData().get("D.count")).isEqualTo(1.0);
        assertThat(ctx.userPrompt()).contains("Beta Team");
    }

    @Test
    void gatherData_nullDriftReport_driftCountIsZero() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId))).thenReturn(null);
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.driftCount()).isEqualTo(0);
        assertThat(ctx.referenceData().get("D.count")).isEqualTo(0.0);
    }

    // -------------------------------------------------------------------------
    // 7. Single trend entry — prev values fall back to current
    // -------------------------------------------------------------------------

    @Test
    void gatherData_singleAlignmentPoint_prevStrategicEqualsCurrent() {
        AlignmentDataPoint only = new AlignmentDataPoint(
                cycleId, "Week 1", Instant.now(), 45.0, 20.0, 10.0, 10.0, 80.0, 20);
        CompletionDataPoint onlyC = new CompletionDataPoint(
                cycleId, "Week 1", Instant.now(), 60.0, 12.0, 6.0, 20, 12);

        when(analyticsService.computeAlignmentTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(only));
        when(analyticsService.computeCompletionTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(onlyC));
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));

        BriefingDataContext ctx = gatherer.gatherData(orgId, cycleId);

        assertThat(ctx.referenceData().get("A.prev_strategic")).isEqualTo(45.0);
        assertThat(ctx.referenceData().get("A.delta")).isEqualTo(0.0);
        assertThat(ctx.referenceData().get("E.prev_completion")).isEqualTo(60.0);
        assertThat(ctx.referenceData().get("E.prev_carry_forward")).isEqualTo(12.0);
    }

    // -------------------------------------------------------------------------
    // Helper utilities
    // -------------------------------------------------------------------------

    /** Creates a Commitment stub with or without a linked RallyCry. */
    private Commitment commitment(boolean withRallyCry) {
        Commitment c = mock(Commitment.class);
        when(c.getRallyCry()).thenReturn(withRallyCry ? mock(RallyCry.class) : null);
        return c;
    }

    /** Stubs alignment + completion trends with two data points each. */
    private void stubAlignmentAndCompletion() {
        AlignmentDataPoint prev = new AlignmentDataPoint(
                cycleId, "Week 11", Instant.now(), 30.0, 20.0, 10.0, 10.0, 50.0, 30);
        AlignmentDataPoint latest = new AlignmentDataPoint(
                cycleId, "Week 12", Instant.now(), 35.0, 25.0, 10.0, 10.0, 60.0, 35);

        CompletionDataPoint prevC = new CompletionDataPoint(
                cycleId, "Week 11", Instant.now(), 50.0, 18.0, 8.0, 30, 15);
        CompletionDataPoint latestC = new CompletionDataPoint(
                cycleId, "Week 12", Instant.now(), 60.0, 14.0, 7.0, 35, 21);

        when(analyticsService.computeAlignmentTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(prev, latest));
        when(analyticsService.computeCompletionTrend(eq(orgId), any(TimeScope.class)))
                .thenReturn(List.of(prevC, latestC));
    }

    /** Full stub for tests that only care about prompt/org-name content. */
    private void stubMinimalHappyPath() {
        stubAlignmentAndCompletion();
        when(driftDetectionService.detectDrift(eq(orgId)))
                .thenReturn(new DriftReport(List.of(), Instant.now()));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(eq(orgId), eq(cycleId)))
                .thenReturn(List.of());
        when(orgRepository.findById(eq(orgId))).thenReturn(Optional.of(org));
    }
}
