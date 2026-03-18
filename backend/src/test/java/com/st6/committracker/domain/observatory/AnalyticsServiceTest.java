package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.observatory.dto.AlignmentDataPoint;
import com.st6.committracker.domain.observatory.dto.CarryForwardChain;
import com.st6.committracker.domain.observatory.dto.CompletionDataPoint;
import com.st6.committracker.domain.observatory.dto.CostWeightedSignal;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
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
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock private CommitmentRepository commitmentRepository;
    @Mock private CycleRepository cycleRepository;
    @Mock private ReconciliationRecordRepository reconciliationRecordRepository;
    @Mock private AppUserRepository userRepository;

    @InjectMocks private AnalyticsService analyticsService;

    private Org org;
    private UUID orgId;
    private AppUser user;
    private ChessCategory strategic;
    private ChessCategory operational;
    private ChessCategory defensive;

    @BeforeEach
    void setUp() {
        orgId = UUID.randomUUID();
        org = Org.builder()
                .id(orgId)
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .build();

        user = new AppUser(org, "user@example.com", "Test User", UserRole.EMPLOYEE, null);
        user.setId(UUID.randomUUID());

        strategic = ChessCategory.builder().org(org).name("Strategic").sortOrder(0).isActive(true).build();
        strategic.setId(UUID.randomUUID());

        operational = ChessCategory.builder().org(org).name("Operational").sortOrder(1).isActive(true).build();
        operational.setId(UUID.randomUUID());

        defensive = ChessCategory.builder().org(org).name("Defensive").sortOrder(2).isActive(true).build();
        defensive.setId(UUID.randomUUID());
    }

    // =========================================================
    // computeAlignmentTrend tests
    // =========================================================

    @Test
    void computeAlignmentTrend_withThreeCycles_returnsCorrectPercentages() {
        Instant base = Instant.parse("2025-01-01T00:00:00Z");
        Cycle week1 = cycle("Week 1", base);
        Cycle week2 = cycle("Week 2", base.plusSeconds(604800));
        Cycle week3 = cycle("Week 3", base.plusSeconds(1209600));

        // week1: 3 strategic, 1 operational → 75% strategic
        // week2: 2 strategic, 2 defensive → 50% strategic
        // week3: 1 strategic, 3 operational → 25% strategic
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId))
                .thenReturn(List.of(week3, week2, week1)); // DESC order from repo

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week1.getId()))
                .thenReturn(List.of(
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, operational, CompletionHorizon.EOD)
                ));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week2.getId()))
                .thenReturn(List.of(
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, defensive, CompletionHorizon.EOD),
                        commitment(user, defensive, CompletionHorizon.EOD)
                ));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week3.getId()))
                .thenReturn(List.of(
                        commitment(user, strategic, CompletionHorizon.EOW),
                        commitment(user, operational, CompletionHorizon.EOD),
                        commitment(user, operational, CompletionHorizon.EOD),
                        commitment(user, operational, CompletionHorizon.EOD)
                ));

        List<AlignmentDataPoint> result = analyticsService.computeAlignmentTrend(orgId, 3);

        assertThat(result).hasSize(3);

        // Results must be sorted chronologically (ascending)
        assertThat(result.get(0).cycleLabel()).isEqualTo("Week 1");
        assertThat(result.get(1).cycleLabel()).isEqualTo("Week 2");
        assertThat(result.get(2).cycleLabel()).isEqualTo("Week 3");

        // Week 1: 75% strategic
        assertThat(result.get(0).strategicPct()).isCloseTo(75.0, within(0.01));
        assertThat(result.get(0).operationalPct()).isCloseTo(25.0, within(0.01));
        assertThat(result.get(0).totalCommitments()).isEqualTo(4);

        // Week 2: 50% strategic
        assertThat(result.get(1).strategicPct()).isCloseTo(50.0, within(0.01));
        assertThat(result.get(1).defensivePct()).isCloseTo(50.0, within(0.01));

        // Week 3: 25% strategic
        assertThat(result.get(2).strategicPct()).isCloseTo(25.0, within(0.01));
        assertThat(result.get(2).operationalPct()).isCloseTo(75.0, within(0.01));
    }

    @Test
    void computeAlignmentTrend_limitsToCycleCount() {
        Instant base = Instant.parse("2025-01-01T00:00:00Z");
        Cycle week1 = cycle("Week 1", base);
        Cycle week2 = cycle("Week 2", base.plusSeconds(604800));
        Cycle week3 = cycle("Week 3", base.plusSeconds(1209600));

        // Repository returns 3 cycles but we request only 2
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId))
                .thenReturn(List.of(week3, week2, week1));

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week3.getId()))
                .thenReturn(List.of(commitment(user, strategic, CompletionHorizon.EOW)));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week2.getId()))
                .thenReturn(List.of(commitment(user, operational, CompletionHorizon.EOD)));

        List<AlignmentDataPoint> result = analyticsService.computeAlignmentTrend(orgId, 2);

        // Should only include the 2 most recent cycles (week3 and week2)
        assertThat(result).hasSize(2);
        // Sorted ascending: week2 first, then week3
        assertThat(result.get(0).cycleLabel()).isEqualTo("Week 2");
        assertThat(result.get(1).cycleLabel()).isEqualTo("Week 3");
    }

    @Test
    void computeAlignmentTrend_emptyCycle_returnsZeroPercentages() {
        Cycle week1 = cycle("Week 1", Instant.now());
        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId))
                .thenReturn(List.of(week1));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week1.getId()))
                .thenReturn(List.of());

        List<AlignmentDataPoint> result = analyticsService.computeAlignmentTrend(orgId, 4);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).strategicPct()).isEqualTo(0.0);
        assertThat(result.get(0).totalCommitments()).isEqualTo(0);
    }

    // =========================================================
    // computeCarryForwardChains tests
    // =========================================================

    @Test
    void computeCarryForwardChains_threeLink_returnsChainLengthThree() {
        UUID cycleId = UUID.randomUUID();
        Cycle originCycle = cycle("Week 1", Instant.parse("2025-01-01T00:00:00Z"));
        Cycle middleCycle = cycle("Week 2", Instant.parse("2025-01-08T00:00:00Z"));
        Cycle targetCycle = cycle("Week 3", Instant.parse("2025-01-15T00:00:00Z"));
        targetCycle.setId(cycleId);

        // Build chain: C1 (origin) ← C2 (intermediate) ← C3 (current cycle)
        Commitment c1 = commitment(user, strategic, CompletionHorizon.EOW);
        c1.setCycle(originCycle);

        Commitment c2 = commitment(user, strategic, CompletionHorizon.EOW);
        c2.setCycle(middleCycle);
        c2.setCarriedFrom(c1);

        Commitment c3 = commitment(user, strategic, CompletionHorizon.EOW);
        c3.setCycle(targetCycle);
        c3.setCarriedFrom(c2);

        // Also include a commitment with no carry-forward
        Commitment fresh = commitment(user, operational, CompletionHorizon.EOD);
        fresh.setCycle(targetCycle);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(c3, fresh));

        List<CarryForwardChain> chains = analyticsService.computeCarryForwardChains(orgId, cycleId);

        // Only c3 should appear — fresh has no carry-forward
        assertThat(chains).hasSize(1);
        CarryForwardChain chain = chains.get(0);
        assertThat(chain.commitmentId()).isEqualTo(c3.getId());
        assertThat(chain.chainLength()).isEqualTo(2);
        assertThat(chain.originCycleLabel()).isEqualTo("Week 1");
        assertThat(chain.userId()).isEqualTo(user.getId());
        assertThat(chain.userDisplayName()).isEqualTo("Test User");
    }

    @Test
    void computeCarryForwardChains_singleCarryForward_returnsChainLengthOne() {
        UUID cycleId = UUID.randomUUID();
        Cycle originCycle = cycle("Week 1", Instant.parse("2025-01-01T00:00:00Z"));
        Cycle currentCycle = cycle("Week 2", Instant.parse("2025-01-08T00:00:00Z"));
        currentCycle.setId(cycleId);

        Commitment original = commitment(user, defensive, CompletionHorizon.EOW);
        original.setCycle(originCycle);

        Commitment carried = commitment(user, defensive, CompletionHorizon.EOW);
        carried.setCycle(currentCycle);
        carried.setCarriedFrom(original);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(carried));

        List<CarryForwardChain> chains = analyticsService.computeCarryForwardChains(orgId, cycleId);

        assertThat(chains).hasSize(1);
        assertThat(chains.get(0).chainLength()).isEqualTo(1);
        assertThat(chains.get(0).originCycleLabel()).isEqualTo("Week 1");
    }

    @Test
    void computeCarryForwardChains_noChainsInCycle_returnsEmpty() {
        UUID cycleId = UUID.randomUUID();
        Commitment fresh = commitment(user, strategic, CompletionHorizon.EOD);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(fresh));

        List<CarryForwardChain> chains = analyticsService.computeCarryForwardChains(orgId, cycleId);

        assertThat(chains).isEmpty();
    }

    // =========================================================
    // computeCostWeightedMisalignment tests
    // =========================================================

    @Test
    void computeCostWeightedMisalignment_higherCostBandWeighsMore() {
        UUID cycleId = UUID.randomUUID();

        // User A: tier 2, hourly rate $50 — 4 non-strategic hours → cost = 4 × 50 = 200
        CostBand bandA = CostBand.builder()
                .org(org).name("Band A").tier(2)
                .hourlyRate(new BigDecimal("50")).build();
        bandA.setId(UUID.randomUUID());

        AppUser userA = new AppUser(org, "a@example.com", "User A", UserRole.EMPLOYEE, null);
        userA.setId(UUID.randomUUID());
        userA.setCostBand(bandA);

        // User B: tier 5, hourly rate $200 — 4 non-strategic hours → cost = 4 × 200 = 800
        CostBand bandB = CostBand.builder()
                .org(org).name("Band B").tier(5)
                .hourlyRate(new BigDecimal("200")).build();
        bandB.setId(UUID.randomUUID());

        AppUser userB = new AppUser(org, "b@example.com", "User B", UserRole.EMPLOYEE, null);
        userB.setId(UUID.randomUUID());
        userB.setCostBand(bandB);

        // Each user has 1 EOD (4h) non-strategic commitment — operational
        Commitment cA = commitment(userA, operational, CompletionHorizon.EOD); // 4h non-strategic
        Commitment cB = commitment(userB, operational, CompletionHorizon.EOD); // 4h non-strategic

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(cA, cB));

        List<CostWeightedSignal> signals = analyticsService.computeCostWeightedMisalignment(orgId, cycleId);

        assertThat(signals).hasSize(2);

        // Results must be sorted descending by misalignment cost
        CostWeightedSignal worst = signals.get(0);
        CostWeightedSignal second = signals.get(1);

        assertThat(worst.userId()).isEqualTo(userB.getId());
        assertThat(worst.misalignmentCost()).isEqualByComparingTo(new BigDecimal("800.00").setScale(2));
        assertThat(worst.costBandTier()).isEqualTo(5);

        assertThat(second.userId()).isEqualTo(userA.getId());
        assertThat(second.misalignmentCost()).isEqualByComparingTo(new BigDecimal("200.00").setScale(2));
        assertThat(second.costBandTier()).isEqualTo(2);
    }

    @Test
    void computeCostWeightedMisalignment_strategicHoursExcluded() {
        UUID cycleId = UUID.randomUUID();

        CostBand band = CostBand.builder()
                .org(org).name("Standard").tier(3)
                .hourlyRate(new BigDecimal("100")).build();
        band.setId(UUID.randomUUID());
        user.setCostBand(band);

        // 1 strategic (EOW=8h) + 1 operational (EOD=4h)
        Commitment strategicWork = commitment(user, strategic, CompletionHorizon.EOW);
        Commitment operationalWork = commitment(user, operational, CompletionHorizon.EOD);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(strategicWork, operationalWork));

        List<CostWeightedSignal> signals = analyticsService.computeCostWeightedMisalignment(orgId, cycleId);

        assertThat(signals).hasSize(1);
        CostWeightedSignal signal = signals.get(0);

        // Total hours = 8 + 4 = 12
        assertThat(signal.totalHours()).isEqualByComparingTo(new BigDecimal("12"));
        // Strategic hours = 8 (EOW)
        assertThat(signal.strategicHours()).isEqualByComparingTo(new BigDecimal("8"));
        // Non-strategic hours = 4 (EOD)
        assertThat(signal.nonStrategicHours()).isEqualByComparingTo(new BigDecimal("4"));
        // Misalignment cost = 4 × 100 = 400
        assertThat(signal.misalignmentCost()).isEqualByComparingTo(new BigDecimal("400.00").setScale(2));
    }

    @Test
    void computeCostWeightedMisalignment_tierFallbackWhenNoHourlyRate() {
        UUID cycleId = UUID.randomUUID();

        // Band with tier=3 but no hourly rate — tier is used as multiplier
        CostBand band = CostBand.builder()
                .org(org).name("Tier Only").tier(3)
                .hourlyRate(null).build();
        band.setId(UUID.randomUUID());
        user.setCostBand(band);

        // 1 EOD operational = 4 non-strategic hours → misalignment = 4 × 3 = 12
        Commitment operationalWork = commitment(user, operational, CompletionHorizon.EOD);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(operationalWork));

        List<CostWeightedSignal> signals = analyticsService.computeCostWeightedMisalignment(orgId, cycleId);

        assertThat(signals).hasSize(1);
        assertThat(signals.get(0).misalignmentCost()).isEqualByComparingTo(new BigDecimal("12"));
    }

    @Test
    void computeCostWeightedMisalignment_estimatedHoursOverridesFallback() {
        UUID cycleId = UUID.randomUUID();

        CostBand band = CostBand.builder()
                .org(org).name("Band").tier(1)
                .hourlyRate(new BigDecimal("10")).build();
        band.setId(UUID.randomUUID());
        user.setCostBand(band);

        // Commitment with explicit 6h estimate (not the EOW=8h default)
        Commitment c = commitment(user, operational, CompletionHorizon.EOW);
        c.setEstimatedHours(new BigDecimal("6"));

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(c));

        List<CostWeightedSignal> signals = analyticsService.computeCostWeightedMisalignment(orgId, cycleId);

        assertThat(signals).hasSize(1);
        // 6h × $10 = $60 (not 8h × $10 = $80)
        assertThat(signals.get(0).misalignmentCost()).isEqualByComparingTo(new BigDecimal("60"));
        assertThat(signals.get(0).nonStrategicHours()).isEqualByComparingTo(new BigDecimal("6"));
    }

    // =========================================================
    // computeCompletionTrend tests
    // =========================================================

    @Test
    void computeCompletionTrend_computesCorrectRates() {
        Instant base = Instant.parse("2025-01-01T00:00:00Z");
        Cycle week1 = cycle("Week 1", base);

        when(cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId))
                .thenReturn(List.of(week1));

        Commitment c1 = commitment(user, strategic, CompletionHorizon.EOW);
        Commitment c2 = commitment(user, operational, CompletionHorizon.EOD);
        Commitment c3 = commitment(user, defensive, CompletionHorizon.AFTERNOON);
        Commitment c4 = commitment(user, operational, CompletionHorizon.MIDDAY);

        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, week1.getId()))
                .thenReturn(List.of(c1, c2, c3, c4));

        // 2 completed, 1 carried forward, 1 not started
        ReconciliationRecord r1 = reconciliationRecord(c1, week1, ReconciliationStatus.COMPLETED);
        ReconciliationRecord r2 = reconciliationRecord(c2, week1, ReconciliationStatus.COMPLETED);
        ReconciliationRecord r3 = reconciliationRecord(c3, week1, ReconciliationStatus.CARRIED_FORWARD);
        ReconciliationRecord r4 = reconciliationRecord(c4, week1, ReconciliationStatus.NOT_STARTED);

        when(reconciliationRecordRepository.findByOrgIdAndCycleIdIn(eq(orgId), any(Collection.class)))
                .thenReturn(List.of(r1, r2, r3, r4));

        List<CompletionDataPoint> result = analyticsService.computeCompletionTrend(orgId, 4);

        assertThat(result).hasSize(1);
        CompletionDataPoint dp = result.get(0);
        assertThat(dp.totalCommitments()).isEqualTo(4);
        assertThat(dp.reconciledCount()).isEqualTo(4);
        assertThat(dp.completionRate()).isCloseTo(50.0, within(0.01));    // 2/4
        assertThat(dp.carryForwardRate()).isCloseTo(25.0, within(0.01));  // 1/4
        assertThat(dp.notStartedRate()).isCloseTo(25.0, within(0.01));   // 1/4
    }

    // =========================================================
    // CategoryUtils unit tests (static utility — no mocks needed)
    // =========================================================

    @Test
    void normalizeCategoryName_handlesTitleCase() {
        assertThat(CategoryUtils.normalizeCategoryName("Strategic")).isEqualTo("Strategic");
        assertThat(CategoryUtils.normalizeCategoryName("Operational")).isEqualTo("Operational");
        assertThat(CategoryUtils.normalizeCategoryName("Defensive")).isEqualTo("Defensive");
        assertThat(CategoryUtils.normalizeCategoryName("Capability Building")).isEqualTo("Capability Building");
    }

    @Test
    void normalizeCategoryName_handlesScreamingCase() {
        assertThat(CategoryUtils.normalizeCategoryName("STRATEGIC")).isEqualTo("Strategic");
        assertThat(CategoryUtils.normalizeCategoryName("OPERATIONAL")).isEqualTo("Operational");
        assertThat(CategoryUtils.normalizeCategoryName("DEFENSIVE")).isEqualTo("Defensive");
        assertThat(CategoryUtils.normalizeCategoryName("CAPABILITY_BUILDING")).isEqualTo("Capability Building");
    }

    @Test
    void normalizeCategoryName_nullReturnsUncategorized() {
        assertThat(CategoryUtils.normalizeCategoryName(null)).isEqualTo("Uncategorized");
    }

    @Test
    void normalizeCategoryName_customCategoryPassesThrough() {
        assertThat(CategoryUtils.normalizeCategoryName("Innovation")).isEqualTo("Innovation");
    }

    @Test
    void resolveEffortHours_usesExplicitValueWhenSet() {
        Commitment c = commitment(user, strategic, CompletionHorizon.EOW);
        c.setEstimatedHours(new BigDecimal("6.5"));
        assertThat(CategoryUtils.resolveEffortHours(c)).isEqualByComparingTo(new BigDecimal("6.5"));
    }

    @Test
    void resolveEffortHours_horizonFallbacks() {
        assertThat(CategoryUtils.resolveEffortHours(commitment(user, strategic, CompletionHorizon.EOW)))
                .isEqualByComparingTo(new BigDecimal("8"));
        assertThat(CategoryUtils.resolveEffortHours(commitment(user, strategic, CompletionHorizon.EOD)))
                .isEqualByComparingTo(new BigDecimal("4"));
        assertThat(CategoryUtils.resolveEffortHours(commitment(user, strategic, CompletionHorizon.AFTERNOON)))
                .isEqualByComparingTo(new BigDecimal("2"));
        assertThat(CategoryUtils.resolveEffortHours(commitment(user, strategic, CompletionHorizon.MIDDAY)))
                .isEqualByComparingTo(new BigDecimal("1"));
        assertThat(CategoryUtils.resolveEffortHours(commitment(user, strategic, CompletionHorizon.MORNING)))
                .isEqualByComparingTo(new BigDecimal("1"));
    }

    // =========================================================
    // Factory helpers
    // =========================================================

    private Cycle cycle(String label, Instant startsAt) {
        Cycle c = Cycle.builder()
                .org(org)
                .label(label)
                .state(CycleState.RECONCILED)
                .startsAt(startsAt)
                .endsAt(startsAt.plusSeconds(604800))
                .isActive(false)
                .build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private Commitment commitment(AppUser owner, ChessCategory category, CompletionHorizon horizon) {
        Commitment c = Commitment.builder()
                .org(org)
                .user(owner)
                .cycle(Cycle.builder().org(org).label("placeholder").state(CycleState.DRAFT)
                        .startsAt(Instant.now()).endsAt(Instant.now().plusSeconds(604800)).build())
                .title("Task")
                .completionHorizon(horizon)
                .chessCategory(category)
                .build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private ReconciliationRecord reconciliationRecord(Commitment c, Cycle cycle, ReconciliationStatus status) {
        ReconciliationRecord r = ReconciliationRecord.builder()
                .org(org)
                .commitment(c)
                .cycle(cycle)
                .status(status)
                .reconciledAt(Instant.now())
                .reconciledBy(user)
                .build();
        r.setId(UUID.randomUUID());
        return r;
    }
}
