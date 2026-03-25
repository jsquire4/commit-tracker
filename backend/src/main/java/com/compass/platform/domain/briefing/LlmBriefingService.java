package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.briefing.dto.*;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.dashboard.DashboardService;
import com.compass.platform.domain.dashboard.dto.AlignmentSignalResponse;
import com.compass.platform.domain.dashboard.dto.DashboardFilters;
import com.compass.platform.domain.dashboard.dto.RcdoCoverageResponse;
import com.compass.platform.domain.dashboard.dto.TeamRollupResponse;
import com.compass.platform.domain.dashboard.dto.TeamSummaryResponse;
import com.compass.platform.domain.dashboard.dto.DashboardResponse;
import com.compass.platform.domain.observatory.AnalyticsService;
import com.compass.platform.domain.observatory.DriftDetectionService;
import com.compass.platform.domain.observatory.dto.*;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openai.client.OpenAIClient;
import com.openai.client.okhttp.OpenAIOkHttpClient;
import com.openai.models.chat.completions.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * LLM-backed implementation of {@link BriefingService}.
 *
 * <p>Orchestrates briefing generation by delegating to:
 * <ul>
 *   <li>{@link BriefingDataGatherer} — data collection</li>
 *   <li>{@link BriefingPromptBuilder} — prompt construction and fallback templates</li>
 *   <li>{@link BriefingResponseBuilder} — response assembly</li>
 *   <li>{@link NarrativeVerifier} — cite-and-verify validation</li>
 * </ul>
 *
 * <p>Model-agnostic — the LLM provider, model name, and base URL are all
 * configurable via {@link LlmConfig}. Swap from OpenAI to Anthropic or any
 * OpenAI-compatible API by changing environment variables.
 */
@Service
@Primary
@Transactional(readOnly = true)
public class LlmBriefingService implements BriefingService {

    private static final Logger log = LoggerFactory.getLogger(LlmBriefingService.class);
    private static final double VERIFICATION_TOLERANCE = 1.0; // 1 percentage point

    private final AnalyticsService analyticsService;
    private final DriftDetectionService driftDetectionService;
    private final CycleRepository cycleRepository;
    private final CommitmentRepository commitmentRepository;
    private final OrgRepository orgRepository;
    private final GeneratedNarrativeRepository narrativeRepository;
    private final LlmConfig llmConfig;
    private final ObjectMapper objectMapper;
    private final DashboardService dashboardService;
    private final BriefingDataGatherer dataGatherer;
    private final BriefingResponseBuilder responseBuilder;
    private final BriefingPromptBuilder promptBuilder;
    private final NarrativeVerifier verifier = new NarrativeVerifier();

    private volatile OpenAIClient client;

    public LlmBriefingService(AnalyticsService analyticsService,
                              DriftDetectionService driftDetectionService,
                              CycleRepository cycleRepository,
                              CommitmentRepository commitmentRepository,
                              OrgRepository orgRepository,
                              GeneratedNarrativeRepository narrativeRepository,
                              LlmConfig llmConfig,
                              ObjectMapper objectMapper,
                              DashboardService dashboardService,
                              BriefingDataGatherer dataGatherer,
                              BriefingResponseBuilder responseBuilder,
                              BriefingPromptBuilder promptBuilder) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.orgRepository = orgRepository;
        this.narrativeRepository = narrativeRepository;
        this.llmConfig = llmConfig;
        this.objectMapper = objectMapper;
        this.dashboardService = dashboardService;
        this.dataGatherer = dataGatherer;
        this.responseBuilder = responseBuilder;
        this.promptBuilder = promptBuilder;
    }

    private OpenAIClient getClient() {
        if (client == null) {
            synchronized (this) {
                if (client == null) {
                    log.info("Initializing LLM client — provider={}, model={}, baseUrl={}",
                            llmConfig.getActiveProvider(),
                            llmConfig.getResolvedModel(),
                            llmConfig.getResolvedBaseUrl());
                    client = OpenAIOkHttpClient.builder()
                            .apiKey(llmConfig.getApiKey())
                            .baseUrl(llmConfig.getResolvedBaseUrl())
                            .build();
                }
            }
        }
        return client;
    }

    // ═══════════════════════════════════════════════════════════════
    // BriefingService implementation
    // ═══════════════════════════════════════════════════════════════

    @Override
    public BriefingResponse generateBriefing(UUID orgId, UUID cycleId) {
        UUID resolvedCycleId = resolveCycleId(orgId, cycleId);
        if (resolvedCycleId == null) {
            return responseBuilder.emptyBriefing();
        }

        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback");
            BriefingDataGatherer.BriefingDataContext ctx = dataGatherer.gatherData(orgId, resolvedCycleId);
            return responseBuilder.buildResponse(promptBuilder.buildBriefingFallback(ctx), List.of(), ctx);
        }

        // Gather data
        BriefingDataGatherer.BriefingDataContext ctx = dataGatherer.gatherData(orgId, resolvedCycleId);

        // TODO: Re-enable caching after prompt iteration is complete.
        // For now, always make a fresh LLM call so we can iterate on the prompt
        // without stale cached results interfering.

        // Generate new narrative
        log.info("Generating BRIEFING narrative for org={} cycle={} model={}", orgId, resolvedCycleId, llmConfig.getResolvedModel());
        String rawOutput = callLlm(promptBuilder.briefingSystemPrompt(), ctx.userPrompt());

        // Verify
        NarrativeVerifier.VerificationResult verification = verifier.verify(
                rawOutput, ctx.referenceData(), VERIFICATION_TOLERANCE);

        String narrative;
        String suggestionsJson;

        if (verification.passed()) {
            // Strip citation tags for clean prose — both narrative and suggestions
            narrative = verifier.stripCitations(extractField(rawOutput, "narrative"));
            suggestionsJson = verifier.stripCitations(extractField(rawOutput, "suggestions"));
        } else {
            log.warn("Verification failed for BRIEFING (cycle={}). Violations: {}. Falling back to template.",
                    resolvedCycleId, verification.violations());
            // Retry once
            String retryOutput = callLlm(promptBuilder.briefingSystemPrompt(), ctx.userPrompt()
                    + "\n\nPREVIOUS ATTEMPT FAILED VERIFICATION. Violations:\n"
                    + String.join("\n", verification.violations())
                    + "\n\nPlease regenerate, ensuring every number matches the provided data exactly.");

            NarrativeVerifier.VerificationResult retryVerification = verifier.verify(
                    retryOutput, ctx.referenceData(), VERIFICATION_TOLERANCE);

            if (retryVerification.passed()) {
                narrative = verifier.stripCitations(extractField(retryOutput, "narrative"));
                suggestionsJson = verifier.stripCitations(extractField(retryOutput, "suggestions"));
                verification = retryVerification;
            } else {
                // Fall back to deterministic template
                log.warn("Retry also failed. Using deterministic fallback for cycle={}", resolvedCycleId);
                narrative = promptBuilder.buildBriefingFallback(ctx);
                suggestionsJson = "[]";
            }
        }

        // TODO: Re-enable storage after prompt iteration is complete.
        // Log verification result for debugging
        log.info("Verification result: passed={}, checks={}, violations={}",
                verification.passed(), verification.checks().size(), verification.violations());

        return responseBuilder.buildResponse(narrative, parseSuggestions(suggestionsJson), ctx);
    }

    @Override
    public ChatResponse generateChat(UUID orgId, List<ChatMessage> messages) {
        log.debug("generateChat orgId={} messageCount={}", orgId, messages.size());

        if (!llmConfig.isConfigured()) {
            String lastMsg = messages.isEmpty() ? "" : messages.get(messages.size() - 1).content();
            return new ChatResponse("LLM not configured. Your question: \"" + lastMsg + "\"", Instant.now());
        }

        // Build system context with org data
        BriefingDataGatherer.BriefingDataContext ctx = dataGatherer.gatherData(orgId, resolveCycleId(orgId, null));
        String chatSystemPrompt = promptBuilder.chatSystemPrompt() + "\n\nCURRENT DATA:\n" + ctx.userPrompt();

        // Build message list
        var paramsBuilder = ChatCompletionCreateParams.builder()
                .model(llmConfig.getResolvedModel())
                .addMessage(ChatCompletionSystemMessageParam.builder()
                        .content(chatSystemPrompt).build())
                .temperature(llmConfig.getTemperature())
                .maxTokens(llmConfig.getMaxTokens());

        for (ChatMessage msg : messages) {
            if ("user".equals(msg.role())) {
                paramsBuilder.addMessage(ChatCompletionUserMessageParam.builder()
                        .content(msg.content()).build());
            } else {
                paramsBuilder.addMessage(ChatCompletionAssistantMessageParam.builder()
                        .content(msg.content()).build());
            }
        }

        ChatCompletion completion = getClient().chat().completions().create(paramsBuilder.build());

        String content = completion.choices().get(0).message().content().orElse("");
        return new ChatResponse(content, Instant.now());
    }


    @Override
    public String generateWeekNarrative(UUID orgId, UUID cycleId) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — skipping week narrative generation for cycleId={}", cycleId);
            List<CompletionDataPoint> trend = analyticsService.computeCompletionTrend(orgId, com.compass.platform.domain.observatory.dto.TimeScope.ofWeeks(12));
            double completionRate = trend.isEmpty() ? 0.0
                    : trend.get(trend.size() - 1).completionRate();
            double carryForwardRate = trend.isEmpty() ? 0.0
                    : trend.get(trend.size() - 1).carryForwardRate();
            return String.format(
                    "Week closed with a %.0f%% completion rate and a %.0f%% carry-forward rate.",
                    completionRate, carryForwardRate);
        }

        BriefingDataGatherer.BriefingDataContext ctx = dataGatherer.gatherData(orgId, cycleId);
        String systemPrompt = """
                You are the intelligence layer for Compass, an execution management platform. \
                Write a 2-3 sentence week-in-review narrative summarising the completed cycle. \
                Use directional language (increased, declined, held steady). Do not evaluate performance. \
                Return ONLY plain text — no JSON, no markdown.""";
        log.info("Generating WEEK_NARRATIVE for org={} cycle={} model={}", orgId, cycleId, llmConfig.getResolvedModel());
        String rawOutput = callLlm(systemPrompt, ctx.userPrompt());
        return verifier.stripCitations(rawOutput.strip());
    }

    @Override
    public String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId) {
        // Load all org commitments fresh — used when called standalone (not in a batch loop)
        List<Commitment> allOrgCommitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);
        return generateTeamSummary(orgId, cycleId, managerId, allOrgCommitments);
    }

    @Override
    public String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId,
                                       List<Commitment> allOrgCommitments) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — skipping sealed team summary for managerId={}", managerId);
            return String.format("Team summary for manager %s is unavailable — no LLM configured.", managerId);
        }

        // Filter pre-loaded commitments to this manager's direct reports
        List<Commitment> teamCommitments = allOrgCommitments.stream()
                .filter(c -> c.getUser() != null
                        && c.getUser().getReportsTo() != null
                        && managerId.equals(c.getUser().getReportsTo().getId()))
                .collect(Collectors.toList());

        int total = teamCommitments.size();
        long linked = teamCommitments.stream()
                .filter(c -> c.getRallyCry() != null).count();
        double coveragePct = total > 0 ? (linked * 100.0 / total) : 0.0;
        String managerName = teamCommitments.stream()
                .findFirst()
                .map(c -> c.getUser().getReportsTo().getDisplayName())
                .orElse(managerId.toString());

        String userPrompt = String.format(
                "Generate a 1-2 sentence team summary for manager %s.%n"
                + "Team commitments: %d total, %.0f%% linked to a rally cry.%n"
                + "Be factual and directional. Return only plain text.",
                managerName, total, coveragePct);
        String sealedSystemPrompt = """
                You are the intelligence layer for Compass. Write a concise team summary \
                for a single manager's team based on the provided data. \
                Use directional language. Do not evaluate performance. Do not name individuals. \
                Return ONLY plain text — no JSON, no markdown.""";
        log.info("Generating SEALED TEAM_SUMMARY for org={} cycle={} manager={} model={}",
                orgId, cycleId, managerId, llmConfig.getResolvedModel());
        String rawOutput = callLlm(sealedSystemPrompt, userPrompt);
        return verifier.stripCitations(rawOutput.strip());
    }

    // ═══════════════════════════════════════════════════════════════
    // Team summary (My Team page)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate an LLM team summary for the My Team AI Summary card.
     *
     * <p>Returns {@code null} when the LLM is not configured — the controller
     * returns 204 No Content so the frontend falls back to the deterministic
     * {@code buildSummary()} function.
     *
     * @param actor          the authenticated manager making the request
     * @param cycleWeekStart optional cycle filter passed through to DashboardService
     */
    @Override
    public TeamSummaryResponse generateTeamSummary(com.compass.platform.domain.user.AppUser actor,
                                                    Instant cycleWeekStart) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — team summary returns null (frontend falls back)");
            return null;
        }

        DashboardFilters filters = new DashboardFilters(cycleWeekStart, null, null, null, null, false);
        DashboardResponse dash = dashboardService.getDashboard(actor, filters);

        TeamRollupResponse rollup = dash.teamRollup();
        AlignmentSignalResponse alignment = dash.alignmentSignal();
        RcdoCoverageResponse coverage = dash.rcdoCoverage();

        int teamSize = rollup != null ? rollup.members().size() : 0;
        int totalCommitments = coverage != null ? coverage.totalCommitments() : 0;
        int unlinkedCount = coverage != null ? coverage.unlinkedCount() : 0;
        double linkedPct = coverage != null ? coverage.linkedPercentage() : 0;
        int uncoveredCount = coverage != null && coverage.uncoveredObjectives() != null
                ? coverage.uncoveredObjectives().size() : 0;

        Map<String, AlignmentSignalResponse.CategoryDistribution> dist =
                alignment != null ? alignment.distribution() : Map.of();
        int teamUnlinked = alignment != null ? alignment.unlinkedCount() : 0;

        String userPrompt = promptBuilder.buildTeamSummaryPrompt(
                teamSize, totalCommitments, dist, teamUnlinked, linkedPct, unlinkedCount,
                uncoveredCount, coverage);

        log.info("Generating TEAM_SUMMARY for managerId={} teamSize={} model={}",
                actor.getId(), teamSize, llmConfig.getResolvedModel());

        String rawOutput = callLlm(promptBuilder.teamSummarySystemPrompt(), userPrompt);

        String headline = "Team Summary";
        String narrative = "";
        List<String> suggestedActions = new ArrayList<>();

        try {
            String cleaned = rawOutput.strip();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
            }
            JsonNode root = objectMapper.readTree(cleaned);
            if (root.has("headline")) headline = root.get("headline").asText();
            if (root.has("narrative")) narrative = root.get("narrative").asText();
            if (root.has("suggestedActions") && root.get("suggestedActions").isArray()) {
                for (JsonNode node : root.get("suggestedActions")) {
                    suggestedActions.add(node.asText());
                }
            }
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse team summary LLM output as JSON — using raw as narrative");
            narrative = rawOutput;
        }

        return new TeamSummaryResponse(headline, narrative, suggestedActions, Instant.now());
    }

    // ═══════════════════════════════════════════════════════════════
    // Program summary
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate a 2-3 sentence program-level summary of execution trajectory
     * over the last {@code weekCount} reconciled cycles.
     *
     * <p>When no LLM API key is configured a deterministic template fallback
     * is returned so the endpoint is always usable.
     */
    @Override
    public ProgramSummaryResponse generateProgramSummary(UUID orgId, com.compass.platform.domain.observatory.dto.TimeScope scope) {
        // Gather trend data
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, scope);
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, scope);
        // For prompt text, derive an approximate week count from the scope
        int weekCount = scope.isWeekCount() ? scope.effectiveWeekCount() : alignmentTrend.size();

        // Derived metrics
        double avgStrategicPct = alignmentTrend.stream()
                .mapToDouble(AlignmentDataPoint::strategicPct).average().orElse(0);
        double avgCompletionRate = completionTrend.stream()
                .mapToDouble(CompletionDataPoint::completionRate).average().orElse(0);
        double avgCarryForwardRate = completionTrend.stream()
                .mapToDouble(CompletionDataPoint::carryForwardRate).average().orElse(0);

        // Trend direction (compare first half vs second half of window)
        String alignTrendDir = promptBuilder.computeTrendDirection(
                alignmentTrend.stream().mapToDouble(AlignmentDataPoint::strategicPct).toArray());
        String completionTrendDir = promptBuilder.computeTrendDirection(
                completionTrend.stream().mapToDouble(CompletionDataPoint::completionRate).toArray());

        // Drift signals
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int driftCount = (driftReport != null && driftReport.signals() != null) ? driftReport.signals().size() : 0;

        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback for program summary");
            return new ProgramSummaryResponse(
                    promptBuilder.buildProgramSummaryFallback(weekCount, avgStrategicPct, avgCompletionRate,
                            avgCarryForwardRate, alignTrendDir, completionTrendDir, driftCount),
                    Instant.now());
        }

        // Build user prompt
        String orgName = orgRepository.findById(orgId).map(Org::getName).orElse("Organization");
        String userPrompt = promptBuilder.buildProgramSummaryPrompt(orgName, weekCount,
                avgStrategicPct, alignTrendDir, avgCompletionRate, completionTrendDir,
                avgCarryForwardRate, driftCount);

        String systemPrompt = promptBuilder.programSummarySystemPrompt(weekCount);

        log.info("Generating PROGRAM SUMMARY narrative for org={} weekCount={} model={}",
                orgId, weekCount, llmConfig.getResolvedModel());

        try {
            String raw = callLlm(systemPrompt, userPrompt);
            // Strip any stray JSON wrapping if the model returns it
            String narrative = raw.strip();
            if (narrative.startsWith("{")) {
                narrative = extractField(narrative, "narrative");
            }
            return new ProgramSummaryResponse(narrative, Instant.now());
        } catch (Exception e) {
            log.warn("LLM call failed for program summary, using fallback: {}", e.getMessage());
            return new ProgramSummaryResponse(
                    promptBuilder.buildProgramSummaryFallback(weekCount, avgStrategicPct, avgCompletionRate,
                            avgCarryForwardRate, alignTrendDir, completionTrendDir, driftCount),
                    Instant.now());
        }
    }

    /**
     * Generates a 2-sentence LLM narrative for a single week's execution data.
     *
     * <p>Loads the {@link AlignmentDataPoint} and {@link CompletionDataPoint} for the
     * specified cycle, builds a compact tagged prompt, and calls GPT-4.1-nano with a
     * short system prompt. Falls back to a deterministic template when the LLM is not
     * configured or when the cycle is not found.
     *
     * @param orgId   organization ID (used for access-scoping)
     * @param cycleId the specific cycle to narrate
     * @return {@link WeekNarrativeResponse} containing the 2-sentence narrative and generation timestamp
     */
    @Override
    public WeekNarrativeResponse generateWeekNarrativeResponse(UUID orgId, UUID cycleId) {
        AlignmentDataPoint alignment = analyticsService.computeAlignmentForCycle(orgId, cycleId);
        CompletionDataPoint completion = analyticsService.computeCompletionForCycle(orgId, cycleId);

        if (alignment == null) {
            return new WeekNarrativeResponse("No data available for this cycle.", Instant.now());
        }

        // Build template fallback (used when LLM is not configured or call fails)
        String templateNarrative = promptBuilder.buildWeekTemplateFallback(alignment, completion);

        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback for week narrative");
            return new WeekNarrativeResponse(templateNarrative, Instant.now());
        }

        try {
            String userPrompt = promptBuilder.buildWeekNarrativePrompt(alignment, completion);
            log.info("Generating WEEK narrative for org={} cycle={} label={} model={}",
                    orgId, cycleId, alignment.cycleLabel(), llmConfig.getResolvedModel());
            String raw = callLlmWithMaxTokens(promptBuilder.weekNarrativeSystemPrompt(), userPrompt, 200);
            String narrative = raw.trim().replaceAll("^[\"']|[\"']$", "");
            if (narrative.isBlank()) {
                log.warn("LLM returned blank narrative for cycle={}, falling back to template", cycleId);
                return new WeekNarrativeResponse(templateNarrative, Instant.now());
            }
            return new WeekNarrativeResponse(narrative, Instant.now());
        } catch (Exception e) {
            log.warn("LLM week narrative failed for cycle={}: {}. Falling back to template.", cycleId, e.getMessage());
            return new WeekNarrativeResponse(templateNarrative, Instant.now());
        }
    }

    // Data gathering delegated to BriefingDataGatherer.java


    // ═══════════════════════════════════════════════════════════════
    // IC Insights — public LLM wrappers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Result type for {@link #generateMyStoryInsights}.
     *
     * <p>Declared here so {@code IcInsightsService} can reference it without
     * a separate file — it is a thin data carrier, not a domain type.
     */
    public record IcMyStoryLlmResult(String narrative, List<String> resumeBullets) {}

    /**
     * Generate a 2-3 sentence IC week narrative.
     *
     * <p>Uses a 300-token cap — sufficient for 2-3 sentences of plain text.
     * Returns {@code null} on LLM failure; the caller falls back to no narrative.
     *
     * @param systemPrompt the system prompt (from {@link BriefingPromptBuilder#IC_WEEK_SUMMARY_SYSTEM_PROMPT})
     * @param userPrompt   the user prompt built by {@link BriefingPromptBuilder#buildIcWeekSummaryPrompt}
     */
    public String generateIcWeekSummary(String systemPrompt, String userPrompt) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — skipping IC week summary narrative");
            return null;
        }
        try {
            String raw = callLlmWithMaxTokens(systemPrompt, userPrompt, 300);
            String narrative = raw == null ? null : raw.trim();
            if (narrative == null || narrative.isBlank()) return null;
            return narrative;
        } catch (Exception e) {
            log.warn("generateIcWeekSummary LLM call failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Generate a longitudinal growth narrative and resume bullets for the IC My Story page.
     *
     * <p>Expects JSON output matching {@code { "narrative": "...", "resumeBullets": [...] }}.
     * Returns {@code null} on LLM failure or parse failure; the caller omits LLM fields gracefully.
     *
     * @param systemPrompt the system prompt (from {@link BriefingPromptBuilder#IC_MY_STORY_SYSTEM_PROMPT})
     * @param userPrompt   the user prompt built by {@link BriefingPromptBuilder#buildIcMyStoryPrompt}
     */
    public IcMyStoryLlmResult generateMyStoryInsights(String systemPrompt, String userPrompt) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — skipping My Story LLM insights");
            return null;
        }
        try {
            String raw = callLlm(systemPrompt, userPrompt);
            if (raw == null || raw.isBlank()) return null;

            String cleaned = raw.strip();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
            }

            JsonNode root = objectMapper.readTree(cleaned);
            String narrative = root.has("narrative") ? root.get("narrative").asText() : null;

            List<String> bullets = new ArrayList<>();
            if (root.has("resumeBullets") && root.get("resumeBullets").isArray()) {
                for (JsonNode node : root.get("resumeBullets")) {
                    bullets.add(node.asText());
                }
            }

            if (narrative == null || narrative.isBlank()) return null;
            return new IcMyStoryLlmResult(narrative, bullets.isEmpty() ? null : bullets);
        } catch (Exception e) {
            log.warn("generateMyStoryInsights LLM call or parse failed: {}", e.getMessage());
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LLM call
    // ═══════════════════════════════════════════════════════════════

    private String callLlm(String systemPrompt, String userPrompt) {
        ChatCompletion completion = getClient().chat().completions().create(
                ChatCompletionCreateParams.builder()
                        .model(llmConfig.getResolvedModel())
                        .addMessage(ChatCompletionSystemMessageParam.builder()
                                .content(systemPrompt).build())
                        .addMessage(ChatCompletionUserMessageParam.builder()
                                .content(userPrompt).build())
                        .temperature(llmConfig.getTemperature())
                        .maxTokens(llmConfig.getMaxTokens())
                        .build());

        return completion.choices().get(0).message().content().orElse("");
    }

    /**
     * Variant of {@link #callLlm} with an explicit {@code maxTokens} override.
     * Used for short-form outputs (e.g. week narratives) where a tight token cap
     * prevents runaway responses.
     */
    private String callLlmWithMaxTokens(String systemPrompt, String userPrompt, int maxTokens) {
        ChatCompletion completion = getClient().chat().completions().create(
                ChatCompletionCreateParams.builder()
                        .model(llmConfig.getResolvedModel())
                        .addMessage(ChatCompletionSystemMessageParam.builder()
                                .content(systemPrompt).build())
                        .addMessage(ChatCompletionUserMessageParam.builder()
                                .content(userPrompt).build())
                        .temperature(llmConfig.getTemperature())
                        .maxTokens(maxTokens)
                        .build());

        return completion.choices().get(0).message().content().orElse("");
    }

    // ═══════════════════════════════════════════════════════════════
    // Parsing helpers
    // ═══════════════════════════════════════════════════════════════

    private String extractField(String rawOutput, String fieldName) {
        try {
            // Try parsing as JSON first
            String cleaned = rawOutput.strip();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
            }
            JsonNode root = objectMapper.readTree(cleaned);
            JsonNode field = root.get(fieldName);
            if (field != null) {
                return field.isTextual() ? field.asText() : field.toString();
            }
        } catch (JsonProcessingException e) {
            log.debug("Could not parse LLM output as JSON, treating as plain text");
        }
        // Fallback: return the raw output as the narrative
        return rawOutput;
    }

    private List<BriefingSuggestion> parseSuggestions(String json) {
        if (json == null || json.isBlank() || "[]".equals(json)) return List.of();
        try {
            JsonNode array = objectMapper.readTree(json);
            List<BriefingSuggestion> result = new ArrayList<>();
            if (array.isArray()) {
                int idx = 0;
                for (JsonNode node : array) {
                    String text = node.has("text") ? node.get("text").asText() : node.toString();
                    String actionType = node.has("actionType") ? node.get("actionType").asText() : "NO_ACTION";
                    result.add(new BriefingSuggestion("s" + (++idx), text, actionType));
                }
            }
            return result;
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse suggestions JSON: {}", e.getMessage());
            return List.of();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

    private UUID resolveCycleId(UUID orgId, UUID cycleId) {
        if (cycleId != null) return cycleId;
        // Use Top12 (bounded query) and take the first — avoids loading the full unbounded list
        List<Cycle> cycles = cycleRepository.findTop12ByOrgIdOrderByStartsAtDesc(orgId);
        return cycles.isEmpty() ? null : cycles.get(0).getId();
    }


}
