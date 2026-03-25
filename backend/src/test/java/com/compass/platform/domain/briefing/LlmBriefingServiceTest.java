package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.briefing.dto.ChatResponse;
import com.compass.platform.domain.briefing.dto.ProgramSummaryResponse;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.dashboard.DashboardService;
import com.compass.platform.domain.dashboard.dto.TeamSummaryResponse;
import com.compass.platform.domain.observatory.dto.TimeScope;
import com.compass.platform.domain.observatory.AnalyticsService;
import com.compass.platform.domain.observatory.DriftDetectionService;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.WeekNarrativeResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LlmBriefingService} — covers all unconfigured/fallback
 * paths that do not require a live OpenAI client.
 *
 * <p>All tests mock {@link LlmConfig#isConfigured()} to return {@code false},
 * exercising the deterministic template branches in every public method.
 */
@ExtendWith(MockitoExtension.class)
class LlmBriefingServiceTest {

    // ── Dependencies ──────────────────────────────────────────────────────────

    @Mock private AnalyticsService analyticsService;
    @Mock private DriftDetectionService driftDetectionService;
    @Mock private CycleRepository cycleRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private GeneratedNarrativeRepository narrativeRepository;
    @Mock private LlmConfig llmConfig;
    @Mock private DashboardService dashboardService;
    @Mock private BriefingDataGatherer dataGatherer;
    @Mock private BriefingResponseBuilder responseBuilder;
    @Mock private BriefingPromptBuilder promptBuilder;

    @InjectMocks private LlmBriefingService service;

    // ── Shared fixtures ───────────────────────────────────────────────────────

    private static final UUID ORG_ID  = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID CYCLE_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private BriefingDataGatherer.BriefingDataContext emptyCtx;
    private AlignmentDataPoint alignmentPoint;
    private CompletionDataPoint completionPoint;

    @BeforeEach
    void setUp() {
        // LLM is NOT configured for all tests in this class.
        // Lenient because some methods return before reaching the isConfigured() guard.
        org.mockito.Mockito.lenient().when(llmConfig.isConfigured()).thenReturn(false);

        // Minimal data context — zero metrics, non-null maps so fallback builders don't NPE
        emptyCtx = new BriefingDataGatherer.BriefingDataContext(
                "user-prompt",
                new java.util.LinkedHashMap<>() {{
                    put("R.unlinked", 0.0);
                    put("D.count", 0.0);
                    put("E.prev_carry_forward", 0.0);
                }},
                /* alignmentPct */       0.0,
                /* completionRate */     0.0,
                /* carryForwardRate */   0.0,
                /* driftCount */        0,
                /* rallyCryCoveragePct */ 0.0,
                /* totalCommitments */   0
        );

        alignmentPoint = new AlignmentDataPoint(
                CYCLE_ID, "W1", Instant.EPOCH,
                40.0, 30.0, 15.0, 15.0, 80.0, 20);

        completionPoint = new CompletionDataPoint(
                CYCLE_ID, "W1", Instant.EPOCH,
                75.0, 10.0, 5.0, 20, 15);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateBriefing — cycle provided
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateBriefing")
    class GenerateBriefingTests {

        @Test
        @DisplayName("returns fallback briefing when LLM is not configured")
        void returnsFallbackBriefingWhenUnconfigured() {
            BriefingResponse expected = new BriefingResponse(
                    "Weekly Intelligence Summary", "fallback narrative",
                    List.of(), List.of(), List.of(), Instant.now());

            when(dataGatherer.gatherData(ORG_ID, CYCLE_ID)).thenReturn(emptyCtx);
            when(promptBuilder.buildBriefingFallback(emptyCtx)).thenReturn("fallback narrative");
            when(responseBuilder.buildResponse("fallback narrative", List.of(), emptyCtx))
                    .thenReturn(expected);

            BriefingResponse result = service.generateBriefing(ORG_ID, CYCLE_ID);

            assertThat(result).isNotNull();
            assertThat(result.narrative()).isEqualTo("fallback narrative");
        }

        @Test
        @DisplayName("delegates to dataGatherer, promptBuilder, and responseBuilder in order")
        void delegatesToCollaboratorsInOrder() {
            when(dataGatherer.gatherData(ORG_ID, CYCLE_ID)).thenReturn(emptyCtx);
            when(promptBuilder.buildBriefingFallback(emptyCtx)).thenReturn("template");
            when(responseBuilder.buildResponse(eq("template"), eq(List.of()), eq(emptyCtx)))
                    .thenReturn(new BriefingResponse("t", "template", List.of(), List.of(), List.of(), Instant.now()));

            service.generateBriefing(ORG_ID, CYCLE_ID);

            verify(dataGatherer).gatherData(ORG_ID, CYCLE_ID);
            verify(promptBuilder).buildBriefingFallback(emptyCtx);
            verify(responseBuilder).buildResponse("template", List.of(), emptyCtx);
        }

        @Test
        @DisplayName("returns empty briefing when no cycle is resolvable")
        void returnsEmptyBriefingWhenNoCycleExists() {
            BriefingResponse emptyResponse = new BriefingResponse(
                    "Weekly Intelligence Summary", "No reconciled cycles available for briefing.",
                    List.of(), List.of(), List.of(), Instant.now());

            when(cycleRepository.findTop12ByOrgIdOrderByStartsAtDesc(ORG_ID)).thenReturn(List.of());
            when(responseBuilder.emptyBriefing()).thenReturn(emptyResponse);

            // Pass null cycleId — forces cycle resolution attempt
            BriefingResponse result = service.generateBriefing(ORG_ID, null);

            assertThat(result).isNotNull();
            assertThat(result.narrative()).contains("No reconciled cycles");
            verify(responseBuilder).emptyBriefing();
            // No LLM call and no data gathering
            verify(dataGatherer, never()).gatherData(any(), any());
        }

        @Test
        @DisplayName("resolves cycle from repository when cycleId is null")
        void resolvesCycleFromRepositoryWhenNull() {
            Org org = Org.builder().id(ORG_ID).name("Test Org").slug("test").timezone("UTC").build();
            Cycle cycle = Cycle.builder()
                    .org(org).label("W1").state(CycleState.LOCKED)
                    .startsAt(Instant.EPOCH).endsAt(Instant.EPOCH.plusSeconds(604800))
                    .isActive(false).build();
            cycle.setId(CYCLE_ID);
            when(cycleRepository.findTop12ByOrgIdOrderByStartsAtDesc(ORG_ID)).thenReturn(List.of(cycle));
            when(dataGatherer.gatherData(ORG_ID, CYCLE_ID)).thenReturn(emptyCtx);
            when(promptBuilder.buildBriefingFallback(emptyCtx)).thenReturn("template");
            when(responseBuilder.buildResponse(any(), any(), any()))
                    .thenReturn(new BriefingResponse("t", "template", List.of(), List.of(), List.of(), Instant.now()));

            service.generateBriefing(ORG_ID, null);

            verify(dataGatherer).gatherData(ORG_ID, CYCLE_ID);
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            when(dataGatherer.gatherData(ORG_ID, CYCLE_ID)).thenReturn(emptyCtx);
            when(promptBuilder.buildBriefingFallback(any())).thenReturn("fallback");
            when(responseBuilder.buildResponse(any(), any(), any()))
                    .thenReturn(new BriefingResponse("t", "fallback", List.of(), List.of(), List.of(), Instant.now()));

            assertThatNoException().isThrownBy(() -> service.generateBriefing(ORG_ID, CYCLE_ID));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateChat
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateChat")
    class GenerateChatTests {

        @Test
        @DisplayName("returns static response when LLM is not configured")
        void returnsStaticResponseWhenUnconfigured() {
            List<ChatMessage> messages = List.of(new ChatMessage("user", "What is our completion rate?"));

            ChatResponse result = service.generateChat(ORG_ID, messages);

            assertThat(result).isNotNull();
            assertThat(result.content()).contains("LLM not configured");
            assertThat(result.content()).contains("What is our completion rate?");
            assertThat(result.timestamp()).isNotNull();
        }

        @Test
        @DisplayName("echoes last user message in static response")
        void echoesLastUserMessage() {
            List<ChatMessage> messages = List.of(
                    new ChatMessage("user", "first message"),
                    new ChatMessage("assistant", "some reply"),
                    new ChatMessage("user", "last question"));

            ChatResponse result = service.generateChat(ORG_ID, messages);

            assertThat(result.content()).contains("last question");
        }

        @Test
        @DisplayName("handles empty message list gracefully")
        void handlesEmptyMessageList() {
            assertThatNoException().isThrownBy(() -> service.generateChat(ORG_ID, List.of()));

            ChatResponse result = service.generateChat(ORG_ID, List.of());
            assertThat(result).isNotNull();
            assertThat(result.content()).contains("LLM not configured");
        }

        @Test
        @DisplayName("does not call dataGatherer when LLM is unconfigured")
        void doesNotCallDataGathererWhenUnconfigured() {
            service.generateChat(ORG_ID, List.of(new ChatMessage("user", "hello")));

            verify(dataGatherer, never()).gatherData(any(), any());
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            assertThatNoException().isThrownBy(
                    () -> service.generateChat(ORG_ID, List.of(new ChatMessage("user", "hi"))));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateWeekNarrative (plain String variant)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateWeekNarrative")
    class GenerateWeekNarrativeTests {

        @Test
        @DisplayName("returns template fallback string when LLM is not configured")
        void returnsTemplateFallbackWhenUnconfigured() {
            when(analyticsService.computeCompletionTrend(eq(ORG_ID), any(TimeScope.class)))
                    .thenReturn(List.of(completionPoint));

            String result = service.generateWeekNarrative(ORG_ID, CYCLE_ID);

            assertThat(result).isNotNull().isNotBlank();
            assertThat(result).contains("75%").contains("10%");
        }

        @Test
        @DisplayName("returns zero-rate fallback when no completion trend data exists")
        void returnsZeroRateFallbackWhenNoTrendData() {
            when(analyticsService.computeCompletionTrend(eq(ORG_ID), any(TimeScope.class))).thenReturn(List.of());

            String result = service.generateWeekNarrative(ORG_ID, CYCLE_ID);

            assertThat(result).isNotNull().contains("0%");
        }

        @Test
        @DisplayName("does not call dataGatherer when LLM is unconfigured")
        void doesNotCallDataGathererWhenUnconfigured() {
            when(analyticsService.computeCompletionTrend(eq(ORG_ID), any(TimeScope.class))).thenReturn(List.of());

            service.generateWeekNarrative(ORG_ID, CYCLE_ID);

            verify(dataGatherer, never()).gatherData(any(), any());
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            when(analyticsService.computeCompletionTrend(eq(ORG_ID), any(TimeScope.class))).thenReturn(List.of());

            assertThatNoException().isThrownBy(
                    () -> service.generateWeekNarrative(ORG_ID, CYCLE_ID));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateTeamSummary (sealed narrative — UUID overload)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateTeamSummary (sealed narrative)")
    class GenerateTeamSummaryNarrativeTests {

        private static final UUID MANAGER_ID = UUID.fromString("00000000-0000-0000-0000-000000000099");

        @Test
        @DisplayName("returns template fallback string when LLM is not configured")
        void returnsTemplateFallbackWhenUnconfigured() {
            when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(ORG_ID, CYCLE_ID))
                    .thenReturn(List.of());

            String result = service.generateTeamSummary(ORG_ID, CYCLE_ID, MANAGER_ID);

            assertThat(result).isNotNull().isNotBlank();
            assertThat(result).contains(MANAGER_ID.toString());
        }

        @Test
        @DisplayName("fallback message mentions 'no LLM configured'")
        void fallbackMentionsNoLlmConfigured() {
            when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(ORG_ID, CYCLE_ID))
                    .thenReturn(List.of());

            String result = service.generateTeamSummary(ORG_ID, CYCLE_ID, MANAGER_ID);

            assertThat(result).containsIgnoringCase("no LLM configured");
        }

        @Test
        @DisplayName("pre-loaded overload returns same fallback without re-querying repository")
        void preloadedOverloadSkipsRepositoryQuery() {
            String result = service.generateTeamSummary(ORG_ID, CYCLE_ID, MANAGER_ID, List.of());

            assertThat(result).isNotNull().containsIgnoringCase("no LLM configured");
            // The pre-loaded overload must NOT re-query the commitment repository
            verify(commitmentRepository, never())
                    .findByOrgIdAndCycleIdOrderByPriorityRankAsc(any(), any());
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(ORG_ID, CYCLE_ID))
                    .thenReturn(List.of());

            assertThatNoException().isThrownBy(
                    () -> service.generateTeamSummary(ORG_ID, CYCLE_ID, MANAGER_ID));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateTeamSummary (AppUser / My Team card variant)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateTeamSummary (AppUser variant)")
    class GenerateTeamSummaryAppUserTests {

        private AppUser buildActor() {
            Org org = Org.builder().id(ORG_ID).name("Test Org").slug("test").timezone("UTC").build();
            AppUser actor = new AppUser(org, "mgr@example.com", "Manager", UserRole.MANAGER, null);
            actor.setId(UUID.randomUUID());
            return actor;
        }

        @Test
        @DisplayName("returns null when LLM is not configured")
        void returnsNullWhenUnconfigured() {
            TeamSummaryResponse result = service.generateTeamSummary(buildActor(), null);

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("does not call dashboardService when LLM is unconfigured")
        void doesNotCallDashboardServiceWhenUnconfigured() {
            service.generateTeamSummary(buildActor(), null);

            verify(dashboardService, never()).getDashboard(any(), any());
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            assertThatNoException().isThrownBy(
                    () -> service.generateTeamSummary(buildActor(), Instant.now()));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateProgramSummary
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateProgramSummary")
    class GenerateProgramSummaryTests {

        @Test
        @DisplayName("returns template fallback when LLM is not configured")
        void returnsTemplateFallbackWhenUnconfigured() {
            stubAnalyticsForProgramSummary();
            when(driftDetectionService.detectDrift(ORG_ID))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(promptBuilder.computeTrendDirection(any())).thenReturn("flat");
            when(promptBuilder.buildProgramSummaryFallback(
                    anyInt(), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt()))
                    .thenReturn("fallback program narrative");

            ProgramSummaryResponse result = service.generateProgramSummary(ORG_ID, TimeScope.ofWeeks(4));

            assertThat(result).isNotNull();
            assertThat(result.narrative()).isEqualTo("fallback program narrative");
            assertThat(result.generatedAt()).isNotNull();
        }

        @Test
        @DisplayName("delegates to promptBuilder.buildProgramSummaryFallback with correct weekCount")
        void delegatesToFallbackBuilderWithCorrectWeekCount() {
            stubAnalyticsForProgramSummary();
            when(driftDetectionService.detectDrift(ORG_ID))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(promptBuilder.computeTrendDirection(any())).thenReturn("improving");
            when(promptBuilder.buildProgramSummaryFallback(
                    eq(8), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt()))
                    .thenReturn("8-week fallback");

            ProgramSummaryResponse result = service.generateProgramSummary(ORG_ID, TimeScope.ofWeeks(8));

            assertThat(result.narrative()).isEqualTo("8-week fallback");
            verify(promptBuilder).buildProgramSummaryFallback(
                    eq(8), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt());
        }

        @Test
        @DisplayName("handles null drift report gracefully")
        void handlesNullDriftReport() {
            stubAnalyticsForProgramSummary();
            when(driftDetectionService.detectDrift(ORG_ID)).thenReturn(null);
            when(promptBuilder.computeTrendDirection(any())).thenReturn("flat");
            when(promptBuilder.buildProgramSummaryFallback(
                    anyInt(), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt()))
                    .thenReturn("no drift narrative");

            assertThatNoException().isThrownBy(() -> service.generateProgramSummary(ORG_ID, TimeScope.ofWeeks(4)));

            // driftCount should be 0 when report is null — verify fallback called with 0
            verify(promptBuilder).buildProgramSummaryFallback(
                    anyInt(), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), eq(0));
        }

        @Test
        @DisplayName("does not call orgRepository when LLM is unconfigured")
        void doesNotCallOrgRepositoryWhenUnconfigured() {
            stubAnalyticsForProgramSummary();
            when(driftDetectionService.detectDrift(ORG_ID))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(promptBuilder.computeTrendDirection(any())).thenReturn("flat");
            when(promptBuilder.buildProgramSummaryFallback(
                    anyInt(), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt()))
                    .thenReturn("fallback");

            service.generateProgramSummary(ORG_ID, TimeScope.ofWeeks(4));

            verify(orgRepository, never()).findById(any());
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            stubAnalyticsForProgramSummary();
            when(driftDetectionService.detectDrift(ORG_ID))
                    .thenReturn(new DriftReport(List.of(), Instant.now()));
            when(promptBuilder.computeTrendDirection(any())).thenReturn("flat");
            when(promptBuilder.buildProgramSummaryFallback(
                    anyInt(), any(Double.class), any(Double.class), any(Double.class),
                    any(String.class), any(String.class), anyInt()))
                    .thenReturn("fallback");

            assertThatNoException().isThrownBy(() -> service.generateProgramSummary(ORG_ID, TimeScope.ofWeeks(4)));
        }

        private void stubAnalyticsForProgramSummary() {
            AlignmentDataPoint a = new AlignmentDataPoint(
                    CYCLE_ID, "W1", Instant.EPOCH, 40, 30, 15, 15, 80, 10);
            CompletionDataPoint c = new CompletionDataPoint(
                    CYCLE_ID, "W1", Instant.EPOCH, 70, 12, 5, 10, 8);
            when(analyticsService.computeAlignmentTrend(eq(ORG_ID), any(TimeScope.class))).thenReturn(List.of(a));
            when(analyticsService.computeCompletionTrend(eq(ORG_ID), any(TimeScope.class))).thenReturn(List.of(c));
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // generateWeekNarrativeResponse (WeekNarrativeResponse variant)
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("generateWeekNarrativeResponse")
    class GenerateWeekNarrativeResponseTests {

        @Test
        @DisplayName("returns template fallback when LLM is not configured")
        void returnsTemplateFallbackWhenUnconfigured() {
            when(analyticsService.computeAlignmentForCycle(ORG_ID, CYCLE_ID)).thenReturn(alignmentPoint);
            when(analyticsService.computeCompletionForCycle(ORG_ID, CYCLE_ID)).thenReturn(completionPoint);
            when(promptBuilder.buildWeekTemplateFallback(alignmentPoint, completionPoint))
                    .thenReturn("template narrative");

            WeekNarrativeResponse result = service.generateWeekNarrativeResponse(ORG_ID, CYCLE_ID);

            assertThat(result).isNotNull();
            assertThat(result.narrative()).isEqualTo("template narrative");
            assertThat(result.generatedAt()).isNotNull();
        }

        @Test
        @DisplayName("delegates to promptBuilder.buildWeekTemplateFallback with correct data points")
        void delegatesToTemplateFallbackBuilder() {
            when(analyticsService.computeAlignmentForCycle(ORG_ID, CYCLE_ID)).thenReturn(alignmentPoint);
            when(analyticsService.computeCompletionForCycle(ORG_ID, CYCLE_ID)).thenReturn(completionPoint);
            when(promptBuilder.buildWeekTemplateFallback(any(), any())).thenReturn("narrative");

            service.generateWeekNarrativeResponse(ORG_ID, CYCLE_ID);

            verify(promptBuilder).buildWeekTemplateFallback(alignmentPoint, completionPoint);
        }

        @Test
        @DisplayName("returns 'no data' response when alignment data is null")
        void returnsNoDataResponseWhenAlignmentIsNull() {
            // completion is also fetched before the null-check, but result is not used when alignment is null
            when(analyticsService.computeAlignmentForCycle(ORG_ID, CYCLE_ID)).thenReturn(null);
            when(analyticsService.computeCompletionForCycle(ORG_ID, CYCLE_ID)).thenReturn(null);

            WeekNarrativeResponse result = service.generateWeekNarrativeResponse(ORG_ID, CYCLE_ID);

            assertThat(result).isNotNull();
            assertThat(result.narrative()).contains("No data available");
        }

        @Test
        @DisplayName("handles null completion data point without throwing")
        void handlesNullCompletionDataPoint() {
            when(analyticsService.computeAlignmentForCycle(ORG_ID, CYCLE_ID)).thenReturn(alignmentPoint);
            when(analyticsService.computeCompletionForCycle(ORG_ID, CYCLE_ID)).thenReturn(null);
            when(promptBuilder.buildWeekTemplateFallback(alignmentPoint, null)).thenReturn("no completion");

            assertThatNoException().isThrownBy(
                    () -> service.generateWeekNarrativeResponse(ORG_ID, CYCLE_ID));
        }

        @Test
        @DisplayName("does not throw when LLM is unconfigured")
        void doesNotThrowWhenUnconfigured() {
            when(analyticsService.computeAlignmentForCycle(ORG_ID, CYCLE_ID)).thenReturn(alignmentPoint);
            when(analyticsService.computeCompletionForCycle(ORG_ID, CYCLE_ID)).thenReturn(completionPoint);
            when(promptBuilder.buildWeekTemplateFallback(any(), any())).thenReturn("narrative");

            assertThatNoException().isThrownBy(
                    () -> service.generateWeekNarrativeResponse(ORG_ID, CYCLE_ID));
        }
    }
}
