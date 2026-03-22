package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.briefing.dto.*;
import com.compass.platform.domain.briefing.dto.BriefingMetric;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * LLM-backed implementation of {@link BriefingService}.
 *
 * <p>Model-agnostic — the LLM provider, model name, and base URL are all
 * configurable via {@link LlmConfig}. Swap from OpenAI to Anthropic or any
 * OpenAI-compatible API by changing environment variables.
 *
 * <p>Uses the cite-and-verify pattern: every number in the prompt is tagged
 * with a reference ID, the LLM is required to cite those refs, and a
 * deterministic {@link NarrativeVerifier} checks the output before storage.
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
                              DashboardService dashboardService) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.orgRepository = orgRepository;
        this.narrativeRepository = narrativeRepository;
        this.llmConfig = llmConfig;
        this.objectMapper = objectMapper;
        this.dashboardService = dashboardService;
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
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback");
            BriefingDataContext ctx = gatherData(orgId, resolveCycleId(orgId, cycleId));
            return buildResponse(buildTemplateFallback(ctx), "[]", ctx);
        }

        UUID resolvedCycleId = resolveCycleId(orgId, cycleId);
        if (resolvedCycleId == null) {
            return emptyBriefing();
        }

        // Gather data
        BriefingDataContext ctx = gatherData(orgId, resolvedCycleId);

        // TODO: Re-enable caching after prompt iteration is complete.
        // For now, always make a fresh LLM call so we can iterate on the prompt
        // without stale cached results interfering.

        // Generate new narrative
        log.info("Generating BRIEFING narrative for org={} cycle={} model={}", orgId, resolvedCycleId, llmConfig.getResolvedModel());
        String rawOutput = callLlm(SYSTEM_PROMPT, ctx.userPrompt());

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
            String retryOutput = callLlm(SYSTEM_PROMPT, ctx.userPrompt()
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
                narrative = buildTemplateFallback(ctx);
                suggestionsJson = "[]";
            }
        }

        // TODO: Re-enable storage after prompt iteration is complete.
        // Log verification result for debugging
        log.info("Verification result: passed={}, checks={}, violations={}",
                verification.passed(), verification.checks().size(), verification.violations());

        return buildResponse(narrative, suggestionsJson, ctx);
    }

    @Override
    public ChatResponse generateChat(UUID orgId, List<ChatMessage> messages) {
        log.debug("generateChat orgId={} messageCount={}", orgId, messages.size());

        if (!llmConfig.isConfigured()) {
            String lastMsg = messages.isEmpty() ? "" : messages.get(messages.size() - 1).content();
            return new ChatResponse("LLM not configured. Your question: \"" + lastMsg + "\"", Instant.now());
        }

        // Build system context with org data
        BriefingDataContext ctx = gatherData(orgId, resolveCycleId(orgId, null));
        String chatSystemPrompt = CHAT_SYSTEM_PROMPT + "\n\nCURRENT DATA:\n" + ctx.userPrompt();

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
            List<CompletionDataPoint> trend = analyticsService.computeCompletionTrend(orgId, 12);
            double completionRate = trend.isEmpty() ? 0.0
                    : trend.get(trend.size() - 1).completionRate();
            double carryForwardRate = trend.isEmpty() ? 0.0
                    : trend.get(trend.size() - 1).carryForwardRate();
            return String.format(
                    "Week closed with a %.0f%% completion rate and a %.0f%% carry-forward rate.",
                    completionRate, carryForwardRate);
        }

        BriefingDataContext ctx = gatherData(orgId, cycleId);
        String systemPrompt = """
                You are the intelligence layer for Compass, an execution management platform.                 Write a 2-3 sentence week-in-review narrative summarising the completed cycle.                 Use directional language (increased, declined, held steady). Do not evaluate performance.                 Return ONLY plain text — no JSON, no markdown.""";
        log.info("Generating WEEK_NARRATIVE for org={} cycle={} model={}", orgId, cycleId, llmConfig.getResolvedModel());
        String rawOutput = callLlm(systemPrompt, ctx.userPrompt());
        return verifier.stripCitations(rawOutput.strip());
    }

    @Override
    public String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — skipping sealed team summary for managerId={}", managerId);
            return String.format("Team summary for manager %s is unavailable — no LLM configured.", managerId);
        }

        // Gather commitments belonging to this manager's direct reports
        List<Commitment> teamCommitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId)
                        .stream()
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
                You are the intelligence layer for Compass. Write a concise team summary                 for a single manager's team based on the provided data.                 Use directional language. Do not evaluate performance. Do not name individuals.                 Return ONLY plain text — no JSON, no markdown.""";
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
    public TeamSummaryResponse generateTeamSummary(com.compass.platform.domain.user.AppUser actor,
                                                    Instant cycleWeekStart) {
        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — team summary returns null (frontend falls back)");
            return null;
        }

        DashboardFilters filters = new DashboardFilters(cycleWeekStart, null, null, null, false);
        com.compass.platform.domain.dashboard.dto.DashboardResponse dash =
                dashboardService.getDashboard(actor, filters);

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

        StringBuilder sb = new StringBuilder();
        sb.append("Generate a team execution summary for a manager's weekly review.\n\n");
        sb.append("TEAM SIZE: ").append(teamSize).append('\n');
        sb.append("TOTAL COMMITMENTS THIS CYCLE: ").append(totalCommitments).append("\n\n");

        sb.append("CHESS DISTRIBUTION:\n");
        for (Map.Entry<String, AlignmentSignalResponse.CategoryDistribution> entry : dist.entrySet()) {
            sb.append(String.format("- %s: %.1f%%%n", entry.getKey(), entry.getValue().percentage()));
        }
        if (teamUnlinked > 0) {
            sb.append(String.format("- Uncategorized: %d commitments%n", teamUnlinked));
        }

        sb.append(String.format("%nRALLY CRY COVERAGE: %.1f%% linked (%d unlinked)%n",
                linkedPct, unlinkedCount));
        sb.append(String.format("UNCOVERED OBJECTIVES: %d%n", uncoveredCount));

        if (coverage != null && coverage.uncoveredObjectives() != null) {
            for (RcdoCoverageResponse.UncoveredObjective uc : coverage.uncoveredObjectives()) {
                sb.append(String.format("- %s (rally cry: %s)%n", uc.title(), uc.rallyCryTitle()));
            }
        }

        log.info("Generating TEAM_SUMMARY for managerId={} teamSize={} model={}",
                actor.getId(), teamSize, llmConfig.getResolvedModel());

        String rawOutput = callLlm(TEAM_SUMMARY_SYSTEM_PROMPT, sb.toString());

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
    public ProgramSummaryResponse generateProgramSummary(UUID orgId, int weekCount) {
        // Gather trend data
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, weekCount);
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, weekCount);

        // Derived metrics
        double avgStrategicPct = alignmentTrend.stream()
                .mapToDouble(AlignmentDataPoint::strategicPct).average().orElse(0);
        double avgCompletionRate = completionTrend.stream()
                .mapToDouble(CompletionDataPoint::completionRate).average().orElse(0);
        double avgCarryForwardRate = completionTrend.stream()
                .mapToDouble(CompletionDataPoint::carryForwardRate).average().orElse(0);

        // Trend direction (compare first half vs second half of window)
        String alignTrendDir = computeTrendDirection(
                alignmentTrend.stream().mapToDouble(AlignmentDataPoint::strategicPct).toArray());
        String completionTrendDir = computeTrendDirection(
                completionTrend.stream().mapToDouble(CompletionDataPoint::completionRate).toArray());

        // Drift signals
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int driftCount = (driftReport != null && driftReport.signals() != null) ? driftReport.signals().size() : 0;

        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback for program summary");
            return new ProgramSummaryResponse(
                    buildProgramSummaryFallback(weekCount, avgStrategicPct, avgCompletionRate,
                            avgCarryForwardRate, alignTrendDir, completionTrendDir, driftCount),
                    Instant.now());
        }

        // Build user prompt
        String orgName = orgRepository.findById(orgId).map(Org::getName).orElse("Organization");
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Summarize %s's execution trajectory over the last %d weeks.\n\n", orgName, weekCount));
        sb.append(String.format("ALIGNMENT: avg strategic %.1f%% [P.avg_strategic], trend %s\n",
                avgStrategicPct, alignTrendDir));
        sb.append(String.format("COMPLETION: avg completion %.1f%% [P.avg_completion], trend %s\n",
                avgCompletionRate, completionTrendDir));
        sb.append(String.format("CARRY-FORWARD: avg carry-forward %.1f%% [P.avg_carry]\n",
                avgCarryForwardRate));
        sb.append(String.format("DRIFT: %d [P.drift] active drift signals\n", driftCount));

        String systemPrompt = PROGRAM_SUMMARY_SYSTEM_PROMPT.replace("{N}", String.valueOf(weekCount));

        log.info("Generating PROGRAM SUMMARY narrative for org={} weekCount={} model={}",
                orgId, weekCount, llmConfig.getResolvedModel());

        try {
            String raw = callLlm(systemPrompt, sb.toString());
            // Strip any stray JSON wrapping if the model returns it
            String narrative = raw.strip();
            if (narrative.startsWith("{")) {
                narrative = extractField(narrative, "narrative");
            }
            return new ProgramSummaryResponse(narrative, Instant.now());
        } catch (Exception e) {
            log.warn("LLM call failed for program summary, using fallback: {}", e.getMessage());
            return new ProgramSummaryResponse(
                    buildProgramSummaryFallback(weekCount, avgStrategicPct, avgCompletionRate,
                            avgCarryForwardRate, alignTrendDir, completionTrendDir, driftCount),
                    Instant.now());
        }
    }

    /** Determine whether values are trending up, down, or flat across a series. */
    private String computeTrendDirection(double[] values) {
        if (values.length < 2) return "flat";
        int half = values.length / 2;
        double firstHalfAvg = 0;
        double secondHalfAvg = 0;
        for (int i = 0; i < half; i++) firstHalfAvg += values[i];
        for (int i = half; i < values.length; i++) secondHalfAvg += values[i];
        firstHalfAvg /= half;
        secondHalfAvg /= (values.length - half);
        double delta = secondHalfAvg - firstHalfAvg;
        if (delta > 2.0) return "improving";
        if (delta < -2.0) return "declining";
        return "flat";
    }

    private String buildProgramSummaryFallback(int weekCount, double avgStrategicPct,
                                                double avgCompletionRate, double avgCarryForwardRate,
                                                String alignTrendDir, String completionTrendDir,
                                                int driftCount) {
        return String.format(
                "Over the last %d weeks, strategic alignment averaged %.0f%% (%s). " +
                "Completion rate averaged %.0f%% (%s) with a carry-forward rate of %.0f%%. " +
                "%d active drift signal%s detected.",
                weekCount,
                avgStrategicPct, alignTrendDir,
                avgCompletionRate, completionTrendDir,
                avgCarryForwardRate,
                driftCount, driftCount == 1 ? "" : "s");
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
    public WeekNarrativeResponse generateWeekNarrativeResponse(UUID orgId, UUID cycleId) {
        AlignmentDataPoint alignment = analyticsService.computeAlignmentForCycle(orgId, cycleId);
        CompletionDataPoint completion = analyticsService.computeCompletionForCycle(orgId, cycleId);

        if (alignment == null) {
            return new WeekNarrativeResponse("No data available for this cycle.", Instant.now());
        }

        // Build template fallback (used when LLM is not configured or call fails)
        String templateNarrative = buildWeekTemplateFallback(alignment, completion);

        if (!llmConfig.isConfigured()) {
            log.debug("No LLM API key configured — using template fallback for week narrative");
            return new WeekNarrativeResponse(templateNarrative, Instant.now());
        }

        try {
            String userPrompt = buildWeekNarrativePrompt(alignment, completion);
            log.info("Generating WEEK narrative for org={} cycle={} label={} model={}",
                    orgId, cycleId, alignment.cycleLabel(), llmConfig.getResolvedModel());
            String raw = callLlmWithMaxTokens(WEEK_NARRATIVE_SYSTEM_PROMPT, userPrompt, 200);
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

    // ═══════════════════════════════════════════════════════════════
    // Data gathering
    // ═══════════════════════════════════════════════════════════════

    record BriefingDataContext(
            String userPrompt,
            Map<String, Double> referenceData,
            double alignmentPct,
            double completionRate,
            double carryForwardRate,
            int driftCount,
            double rallyCryCoveragePct,
            int totalCommitments
    ) {}

    private BriefingDataContext gatherData(UUID orgId, UUID cycleId) {
        // Alignment
        List<AlignmentDataPoint> alignmentTrend = analyticsService.computeAlignmentTrend(orgId, 12);
        AlignmentDataPoint latest = alignmentTrend.isEmpty() ? null : alignmentTrend.get(alignmentTrend.size() - 1);
        AlignmentDataPoint previous = alignmentTrend.size() < 2 ? null : alignmentTrend.get(alignmentTrend.size() - 2);

        double strategicPct = latest != null ? latest.strategicPct() : 0;
        double operationalPct = latest != null ? latest.operationalPct() : 0;
        double defensivePct = latest != null ? latest.defensivePct() : 0;
        double capabilityPct = latest != null ? latest.capabilityBuildingPct() : 0;
        double uncategorizedPct = Math.max(0, 100 - strategicPct - operationalPct - defensivePct - capabilityPct);
        int totalCommitments = latest != null ? latest.totalCommitments() : 0;
        double prevStrategicPct = previous != null ? previous.strategicPct() : strategicPct;

        // Completion
        List<CompletionDataPoint> completionTrend = analyticsService.computeCompletionTrend(orgId, 12);
        CompletionDataPoint latestCompletion = completionTrend.isEmpty() ? null : completionTrend.get(completionTrend.size() - 1);
        CompletionDataPoint prevCompletion = completionTrend.size() < 2 ? null : completionTrend.get(completionTrend.size() - 2);

        double completionRate = latestCompletion != null ? latestCompletion.completionRate() : 0;
        double carryForwardRate = latestCompletion != null ? latestCompletion.carryForwardRate() : 0;
        double notStartedRate = latestCompletion != null ? latestCompletion.notStartedRate() : 0;
        double prevCompletionRate = prevCompletion != null ? prevCompletion.completionRate() : completionRate;
        double prevCarryForwardRate = prevCompletion != null ? prevCompletion.carryForwardRate() : carryForwardRate;

        // Drift
        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        int driftCount = (driftReport != null && driftReport.signals() != null) ? driftReport.signals().size() : 0;

        // Rally cry coverage
        double rallyCryCoveragePct = 0;
        int unlinkedCount = 0;
        if (cycleId != null) {
            List<Commitment> cycleCommitments = commitmentRepository
                    .findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);
            int cycleTotal = cycleCommitments.size();
            long linked = cycleCommitments.stream().filter(c -> c.getRallyCry() != null).count();
            rallyCryCoveragePct = cycleTotal > 0 ? (linked * 100.0 / cycleTotal) : 0;
            unlinkedCount = cycleTotal - (int) linked;
        }

        // Org name
        String orgName = orgRepository.findById(orgId).map(Org::getName).orElse("Organization");

        // Build reference data map (every number the LLM receives, keyed for verification)
        Map<String, Double> refData = new LinkedHashMap<>();
        refData.put("A.strategic", strategicPct);
        refData.put("A.operational", operationalPct);
        refData.put("A.defensive", defensivePct);
        refData.put("A.capability", capabilityPct);
        refData.put("A.uncategorized", uncategorizedPct);
        refData.put("A.prev_strategic", prevStrategicPct);
        refData.put("A.delta", strategicPct - prevStrategicPct);
        // CompletionDataPoint rates are already 0-100 scale (percentages, not ratios)
        refData.put("E.completion", completionRate);
        refData.put("E.carry_forward", carryForwardRate);
        refData.put("E.not_started", notStartedRate);
        refData.put("E.prev_completion", prevCompletionRate);
        refData.put("E.prev_carry_forward", prevCarryForwardRate);
        refData.put("R.coverage", rallyCryCoveragePct);
        refData.put("R.unlinked", (double) unlinkedCount);
        refData.put("D.count", (double) driftCount);
        refData.put("T.total", (double) totalCommitments);

        // Build tagged user prompt
        StringBuilder sb = new StringBuilder();
        sb.append("Generate an executive briefing for this cycle.\n\n");
        sb.append("ORG: ").append(orgName).append("\n");
        sb.append("TOTAL COMMITMENTS: ").append(totalCommitments).append(" [T.total]\n\n");

        sb.append("ALIGNMENT:\n");
        sb.append(String.format("- Strategic: %.1f%% [A.strategic]\n", strategicPct));
        sb.append(String.format("- Operational: %.1f%% [A.operational]\n", operationalPct));
        sb.append(String.format("- Defensive: %.1f%% [A.defensive]\n", defensivePct));
        sb.append(String.format("- Capability Building: %.1f%% [A.capability]\n", capabilityPct));
        sb.append(String.format("- Uncategorized: %.1f%% [A.uncategorized]\n", uncategorizedPct));
        sb.append(String.format("- Previous cycle strategic: %.1f%% [A.prev_strategic] (delta: %.1f pp [A.delta])\n\n",
                prevStrategicPct, strategicPct - prevStrategicPct));

        sb.append("EXECUTION:\n");
        sb.append(String.format("- Completion rate: %.1f%% [E.completion] (previous: %.1f%% [E.prev_completion])\n",
                completionRate, prevCompletionRate));
        sb.append(String.format("- Carry-forward rate: %.1f%% [E.carry_forward] (previous: %.1f%% [E.prev_carry_forward])\n",
                carryForwardRate, prevCarryForwardRate));
        sb.append(String.format("- Not started rate: %.1f%% [E.not_started]\n\n", notStartedRate));

        sb.append("RALLY CRY COVERAGE:\n");
        sb.append(String.format("- %.1f%% [R.coverage] of commitments linked to a rally cry\n", rallyCryCoveragePct));
        sb.append(String.format("- %d [R.unlinked] commitments unlinked\n\n", unlinkedCount));

        sb.append(String.format("DRIFT SIGNALS: %d [D.count] active\n", driftCount));
        if (driftReport != null && driftReport.signals() != null) {
            for (DriftSignal signal : driftReport.signals()) {
                sb.append(String.format("- %s (%s): %s %s — current %.1f, baseline %.1f, %d weeks\n",
                        signal.unitName(), signal.unitType(), signal.metric(), signal.severity(),
                        signal.currentValue(), signal.baselineValue(), signal.weekCount()));
            }
        }

        return new BriefingDataContext(
                sb.toString(), refData, strategicPct, completionRate, carryForwardRate,
                driftCount, rallyCryCoveragePct, totalCommitments);
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
    // Response builders
    // ═══════════════════════════════════════════════════════════════

    private BriefingResponse buildResponse(String narrative, String suggestionsJson, BriefingDataContext ctx) {
        List<BriefingSuggestion> suggestions = parseSuggestions(suggestionsJson);
        List<BriefingCitation> citations = buildCitations(ctx);
        List<BriefingMetric> metrics = buildMetrics(ctx);
        return new BriefingResponse("Weekly Intelligence Summary", narrative, suggestions, citations, metrics, Instant.now());
    }

    private BriefingResponse buildResponseFromCache(GeneratedNarrative cached, BriefingDataContext ctx) {
        List<BriefingSuggestion> suggestions = parseSuggestions(cached.getSuggestions());
        List<BriefingCitation> citations = buildCitations(ctx);
        List<BriefingMetric> metrics = buildMetrics(ctx);
        return new BriefingResponse("Weekly Intelligence Summary", cached.getContent(), suggestions, citations, metrics, cached.getGeneratedAt());
    }

    private BriefingResponse emptyBriefing() {
        return new BriefingResponse("Weekly Intelligence Summary", "No reconciled cycles available for briefing.", List.of(), List.of(), List.of(), Instant.now());
    }

    /** Deterministic citations — always computed from data, never LLM-generated. */
    private List<BriefingCitation> buildCitations(BriefingDataContext ctx) {
        List<BriefingCitation> citations = new ArrayList<>();
        citations.add(new BriefingCitation("c1",
                String.format("Strategic alignment: %.0f%%", ctx.alignmentPct()),
                "Computed from " + ctx.totalCommitments() + " commitments",
                "View breakdown"));
        citations.add(new BriefingCitation("c2",
                String.format("Rally Cry Coverage: %.0f%%", ctx.rallyCryCoveragePct()),
                "Commitments linked to a Rally Cry / total commitments",
                "View details"));
        citations.add(new BriefingCitation("c3",
                String.format("Carry-Forward Rate: %.0f%%", ctx.carryForwardRate()),
                "From reconciliation records",
                "View list"));
        citations.add(new BriefingCitation("c4",
                String.format("Active Drift Signals: %d", ctx.driftCount()),
                "Observatory Drift Detection",
                "View signals"));
        return citations;
    }

    /** Deterministic metrics — always computed from data, never LLM-generated. */
    private List<BriefingMetric> buildMetrics(BriefingDataContext ctx) {
        String alignTrend = ctx.referenceData().getOrDefault("A.delta", 0.0) > 0 ? "up"
                : ctx.referenceData().getOrDefault("A.delta", 0.0) < -1 ? "down" : "flat";
        String carryTrend = ctx.carryForwardRate() > ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "up"
                : ctx.carryForwardRate() < ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "down" : "flat";

        return List.of(
                new BriefingMetric("alignment", "Strategic Alignment", Math.round(ctx.alignmentPct()), "%", alignTrend),
                new BriefingMetric("coverage", "Rally Cry Coverage", Math.round(ctx.rallyCryCoveragePct()), "%", null),
                new BriefingMetric("carry", "Carry-Forward Rate", Math.round(ctx.carryForwardRate()), "%", carryTrend),
                new BriefingMetric("completion", "Completion Rate", Math.round(ctx.completionRate()), "%", null),
                new BriefingMetric("drift", "Active Drift Signals", ctx.driftCount(), null, null)
        );
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

    private String buildWeekNarrativePrompt(AlignmentDataPoint alignment, CompletionDataPoint completion) {
        StringBuilder sb = new StringBuilder();
        sb.append("Week: ").append(alignment.cycleLabel()).append("\n\n");
        sb.append("CHESS BREAKDOWN:\n");
        sb.append(String.format("- Strategic: %.1f%%\n", alignment.strategicPct()));
        sb.append(String.format("- Operational: %.1f%%\n", alignment.operationalPct()));
        sb.append(String.format("- Defensive: %.1f%%\n", alignment.defensivePct()));
        sb.append(String.format("- Capability Building: %.1f%%\n", alignment.capabilityBuildingPct()));
        double uncategorized = Math.max(0, 100 - alignment.strategicPct() - alignment.operationalPct()
                - alignment.defensivePct() - alignment.capabilityBuildingPct());
        sb.append(String.format("- Not Categorized: %.1f%%\n", uncategorized));
        sb.append(String.format("- Total commitments: %d\n\n", alignment.totalCommitments()));

        if (completion != null) {
            sb.append("EXECUTION:\n");
            sb.append(String.format("- Completion rate: %.1f%%\n", completion.completionRate()));
            sb.append(String.format("- Carry-forward rate: %.1f%%\n", completion.carryForwardRate()));
            sb.append(String.format("- Not started rate: %.1f%%\n", completion.notStartedRate()));
        }
        return sb.toString();
    }

    private String buildWeekTemplateFallback(AlignmentDataPoint alignment, CompletionDataPoint completion) {
        double defensivePct = alignment.defensivePct();
        String sentence1;
        if (defensivePct > 15) {
            sentence1 = String.format("Defensive work was elevated at %.0f%% this week, pulling capacity away from strategic initiatives.",
                    defensivePct);
        } else {
            sentence1 = String.format("Strategic work made up %.0f%% of commitments this week, with a balanced mix across operational and capability categories.",
                    alignment.strategicPct());
        }
        String sentence2;
        if (completion != null) {
            sentence2 = String.format("Completion rate was %.0f%% and carry-forward rate stood at %.0f%%.",
                    completion.completionRate(), completion.carryForwardRate());
        } else {
            sentence2 = String.format("Strategic alignment was at %.0f%% for the week.", alignment.strategicPct());
        }
        return sentence1 + " " + sentence2;
    }

    private String buildTemplateFallback(BriefingDataContext ctx) {
        return String.format(
                "Strategic alignment is at %.0f%% this cycle. " +
                "Rally cry coverage stands at %.0f%% with %.0f unlinked commitments. " +
                "Carry-forward rate is %.0f%%. " +
                "%.0f active drift signal%s detected.",
                ctx.alignmentPct(),
                ctx.rallyCryCoveragePct(),
                ctx.referenceData().get("R.unlinked"),
                ctx.carryForwardRate(),
                ctx.referenceData().get("D.count"),
                ctx.driftCount() == 1 ? "" : "s");
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

    private UUID resolveCycleId(UUID orgId, UUID cycleId) {
        if (cycleId != null) return cycleId;
        List<Cycle> cycles = cycleRepository.findByOrgIdOrderByStartsAtDesc(orgId);
        return cycles.isEmpty() ? null : cycles.get(0).getId();
    }

    private String hashPrompt(String prompt) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(prompt.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String serializeVerification(NarrativeVerifier.VerificationResult result) {
        try {
            return objectMapper.writeValueAsString(result);
        } catch (JsonProcessingException e) {
            return "{\"error\": \"serialization_failed\"}";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // System prompts
    // ═══════════════════════════════════════════════════════════════

    static final String WEEK_NARRATIVE_SYSTEM_PROMPT = """
            Generate a 2-sentence summary of this week's execution data. \
            Report data and change only. Use directional language (increased, declined, \
            held steady) not judgmental language. Do not evaluate performance. \
            The four commitment categories are: Strategic, Operational, Defensive, and \
            Capability Building. Refer to them as "commitment categories" — never say \
            "chess strategies" or "chess categories." \
            Return plain text only — no JSON, no markdown, no bullet points.""";

    static final String SYSTEM_PROMPT = """
            You are the intelligence layer for Compass, an execution management platform \
            used by PE portfolio companies. You produce executive briefings that summarize \
            a week of team execution data.

            RULES:
            - Report data and change. Do not evaluate performance.
            - Use directional language (increased, declined, held steady) not judgmental \
            language (good, bad, concerning, impressive).
            - Every number you cite MUST include its reference tag in square brackets \
            immediately after the number. Example: "Strategic work is at 41% [A.strategic]"
            - If you cannot cite a reference for a number, do not include that number.
            - Never name individuals. Refer to teams by manager name only.
            - Keep the narrative to 2-4 sentences. Dense, not verbose.
            - Suggested actions must be specific and actionable — say what to look for and why.

            OUTPUT FORMAT (JSON):
            {
              "narrative": "2-4 sentences with [ref] citations after every number",
              "suggestions": [
                {
                  "text": "specific actionable recommendation with [ref] citations",
                  "actionType": "REVIEW_COVERAGE | DISPLACEMENT_REVIEW | INVESTIGATE_DRIFT | CAPACITY_CHECK | NO_ACTION"
                }
              ]
            }

            Return ONLY the JSON object. No markdown fences, no extra text.""";

    static final String CHAT_SYSTEM_PROMPT = """
            You are the Compass Intelligence assistant for a PE portfolio company's execution \
            management platform. You answer questions about weekly execution data — alignment, \
            completion, carry-forward, drift signals, and rally cry coverage.

            RULES:
            - Only reference data provided in the CURRENT DATA section below.
            - If you don't have data to answer a question, say so. Never fabricate.
            - Report data and change. Do not evaluate performance.
            - Use directional language, not judgmental language.
            - Keep answers concise — 2-5 sentences unless the user asks for detail.
            - When citing numbers, use the exact values from the data.""";

    static final String PROGRAM_SUMMARY_SYSTEM_PROMPT = """
            Summarize the organization's execution trajectory over the last {N} weeks. \
            2-3 sentences. Report data and change, do not evaluate performance.

            RULES:
            - Use directional language (increased, declined, held steady) not judgmental \
            language (good, bad, concerning, impressive).
            - Cite the key metrics: strategic alignment average, completion rate average, \
            carry-forward rate, and active drift signals.
            - Do not use bullet points or headers. Write flowing prose.
            - Return only the narrative text. No JSON, no markdown, no extra commentary.""";

    static final String TEAM_SUMMARY_SYSTEM_PROMPT = """
            Summarize this manager's team execution data. Include 2-4 specific suggested \
            actions. Report data and change only.

            RULES:
            - Always mention team size.
            - Use directional language (increased, declined, holds) not judgmental language \
            (good, bad, concerning, impressive).
            - Never name individuals.
            - Narrative: 2-3 sentences of flowing prose. Dense, not verbose.
            - Suggested actions must be specific and actionable — say exactly what to look \
            for and why.
            - IMPORTANT TERMINOLOGY: "Unlinked commitments" means commitments NOT linked \
            to any rally cry. "Uncovered objectives" means rally cry objectives that have \
            ZERO commitments assigned to them. These are different concepts — use the correct \
            term for each. Never say "unlinked objectives" or "unaddressed objectives" — say \
            "uncovered objectives."
            - Do not contradict yourself. If rally cry coverage is 100% (all commitments \
            are linked), do not say objectives are "uncovered" unless you clearly distinguish \
            that some rally cry sub-objectives have zero commitments despite full linkage.

            OUTPUT FORMAT (JSON):
            {
              "headline": "Team Summary",
              "narrative": "2-3 sentences summarising team execution state",
              "suggestedActions": [
                "specific actionable recommendation",
                "another recommendation"
              ]
            }

            Return ONLY the JSON object. No markdown fences, no extra text.""";
}
