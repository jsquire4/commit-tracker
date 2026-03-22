package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.briefing.dto.*;
import com.compass.platform.domain.briefing.dto.BriefingMetric;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
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
    private final NarrativeVerifier verifier = new NarrativeVerifier();

    private volatile OpenAIClient client;

    public LlmBriefingService(AnalyticsService analyticsService,
                              DriftDetectionService driftDetectionService,
                              CycleRepository cycleRepository,
                              CommitmentRepository commitmentRepository,
                              OrgRepository orgRepository,
                              GeneratedNarrativeRepository narrativeRepository,
                              LlmConfig llmConfig,
                              ObjectMapper objectMapper) {
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.cycleRepository = cycleRepository;
        this.commitmentRepository = commitmentRepository;
        this.orgRepository = orgRepository;
        this.narrativeRepository = narrativeRepository;
        this.llmConfig = llmConfig;
        this.objectMapper = objectMapper;
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
            // Strip citation tags for clean prose
            narrative = verifier.stripCitations(extractField(rawOutput, "narrative"));
            suggestionsJson = extractField(rawOutput, "suggestions");
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
                suggestionsJson = extractField(retryOutput, "suggestions");
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
        refData.put("E.completion", completionRate * 100);
        refData.put("E.carry_forward", carryForwardRate * 100);
        refData.put("E.not_started", notStartedRate * 100);
        refData.put("E.prev_completion", prevCompletionRate * 100);
        refData.put("E.prev_carry_forward", prevCarryForwardRate * 100);
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
                completionRate * 100, prevCompletionRate * 100));
        sb.append(String.format("- Carry-forward rate: %.1f%% [E.carry_forward] (previous: %.1f%% [E.prev_carry_forward])\n",
                carryForwardRate * 100, prevCarryForwardRate * 100));
        sb.append(String.format("- Not started rate: %.1f%% [E.not_started]\n\n", notStartedRate * 100));

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
                String.format("Carry-Forward Rate: %.0f%%", ctx.carryForwardRate() * 100),
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
        String carryTrend = ctx.carryForwardRate() * 100 > ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "down"
                : ctx.carryForwardRate() * 100 < ctx.referenceData().getOrDefault("E.prev_carry_forward", 0.0) ? "up" : "flat";

        return List.of(
                new BriefingMetric("alignment", "Strategic Alignment", Math.round(ctx.alignmentPct()), "%", alignTrend),
                new BriefingMetric("coverage", "Rally Cry Coverage", Math.round(ctx.rallyCryCoveragePct()), "%", null),
                new BriefingMetric("carry", "Carry-Forward Rate", Math.round(ctx.carryForwardRate() * 100), "%", carryTrend),
                new BriefingMetric("completion", "Completion Rate", Math.round(ctx.completionRate() * 100), "%", null),
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

    private String buildTemplateFallback(BriefingDataContext ctx) {
        return String.format(
                "Strategic alignment is at %.0f%% this cycle. " +
                "Rally cry coverage stands at %.0f%% with %.0f unlinked commitments. " +
                "Carry-forward rate is %.0f%%. " +
                "%.0f active drift signal%s detected.",
                ctx.alignmentPct(),
                ctx.rallyCryCoveragePct(),
                ctx.referenceData().get("R.unlinked"),
                ctx.carryForwardRate() * 100,
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
}
