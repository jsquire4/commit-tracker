package com.compass.platform.domain.briefing;

import com.compass.platform.domain.dashboard.dto.AlignmentSignalResponse;
import com.compass.platform.domain.dashboard.dto.RcdoCoverageResponse;
import com.compass.platform.domain.observatory.dto.AlignmentDataPoint;
import com.compass.platform.domain.observatory.dto.CompletionDataPoint;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Constructs all prompts, system prompts, and deterministic fallback
 * templates for LLM briefing generation.
 *
 * <p>Extracted from {@link LlmBriefingService} and {@link BriefingResponseBuilder}
 * to keep prompt concerns separate from orchestration and response assembly.
 */
@Component
public class BriefingPromptBuilder {

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

    static final String BRIEFING_SYSTEM_PROMPT = """
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

    // ═══════════════════════════════════════════════════════════════
    // System prompt accessors
    // ═══════════════════════════════════════════════════════════════

    public String weekNarrativeSystemPrompt() {
        return WEEK_NARRATIVE_SYSTEM_PROMPT;
    }

    public String briefingSystemPrompt() {
        return BRIEFING_SYSTEM_PROMPT;
    }

    public String chatSystemPrompt() {
        return CHAT_SYSTEM_PROMPT;
    }

    public String programSummarySystemPrompt(int weekCount) {
        return PROGRAM_SUMMARY_SYSTEM_PROMPT.replace("{N}", String.valueOf(weekCount));
    }

    public String teamSummarySystemPrompt() {
        return TEAM_SUMMARY_SYSTEM_PROMPT;
    }

    // ═══════════════════════════════════════════════════════════════
    // Prompt builders
    // ═══════════════════════════════════════════════════════════════

    public String buildWeekNarrativePrompt(AlignmentDataPoint alignment, CompletionDataPoint completion) {
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

    public String buildTeamSummaryPrompt(int teamSize, int totalCommitments,
                                          Map<String, AlignmentSignalResponse.CategoryDistribution> dist,
                                          int teamUnlinked, double linkedPct, int unlinkedCount,
                                          int uncoveredCount, RcdoCoverageResponse coverage) {
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

        return sb.toString();
    }

    public String buildProgramSummaryPrompt(String orgName, int weekCount,
                                             double avgStrategicPct, String alignTrendDir,
                                             double avgCompletionRate, String completionTrendDir,
                                             double avgCarryForwardRate, int driftCount) {
        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Summarize %s's execution trajectory over the last %d weeks.\n\n", orgName, weekCount));
        sb.append(String.format("ALIGNMENT: avg strategic %.1f%% [P.avg_strategic], trend %s\n",
                avgStrategicPct, alignTrendDir));
        sb.append(String.format("COMPLETION: avg completion %.1f%% [P.avg_completion], trend %s\n",
                avgCompletionRate, completionTrendDir));
        sb.append(String.format("CARRY-FORWARD: avg carry-forward %.1f%% [P.avg_carry]\n",
                avgCarryForwardRate));
        sb.append(String.format("DRIFT: %d [P.drift] active drift signals\n", driftCount));
        return sb.toString();
    }

    // ═══════════════════════════════════════════════════════════════
    // Deterministic fallback templates
    // ═══════════════════════════════════════════════════════════════

    public String buildWeekTemplateFallback(AlignmentDataPoint alignment, CompletionDataPoint completion) {
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
            sentence2 = String.format("Rally cry coverage was at %.0f%% for the week.", alignment.rallyCoveragePct());
        }
        return sentence1 + " " + sentence2;
    }

    public String buildBriefingFallback(BriefingDataGatherer.BriefingDataContext ctx) {
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

    public String buildProgramSummaryFallback(int weekCount, double avgStrategicPct,
                                               double avgCompletionRate, double avgCarryForwardRate,
                                               String alignTrendDir, String completionTrendDir,
                                               int driftCount) {
        return String.format(
                "Over the past %d weeks, the program has maintained an average strategic allocation of %.0f%% " +
                "(%s) with a %.0f%% completion rate (%s). Carry-forward rate averages %.0f%%. " +
                "%d active drift signal%s.",
                weekCount, avgStrategicPct, alignTrendDir,
                avgCompletionRate, completionTrendDir,
                avgCarryForwardRate, driftCount, driftCount == 1 ? "" : "s");
    }

    // ═══════════════════════════════════════════════════════════════
    // Utilities
    // ═══════════════════════════════════════════════════════════════

    public String computeTrendDirection(double[] values) {
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
}
