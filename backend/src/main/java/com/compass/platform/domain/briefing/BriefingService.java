package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.briefing.dto.ChatResponse;
import com.compass.platform.domain.briefing.dto.ProgramSummaryResponse;
import com.compass.platform.domain.dashboard.dto.TeamSummaryResponse;
import com.compass.platform.domain.observatory.dto.WeekNarrativeResponse;
import com.compass.platform.domain.user.AppUser;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for generating executive briefings and handling chat interactions.
 *
 * <p>Implementations gather real metrics from observatory services and compose
 * narrative summaries with citations and actionable suggestions.
 */
public interface BriefingService {

    /**
     * Generate an executive briefing for the given org and cycle (S1 — briefing narrative).
     *
     * @param orgId   the organization to brief
     * @param cycleId the cycle to analyse (uses most recent reconciled cycle if null)
     * @return assembled briefing with narrative, suggestions, and citations
     */
    BriefingResponse generateBriefing(UUID orgId, UUID cycleId);

    /**
     * Generate a week-in-review narrative for the given cycle (S3 — week narrative).
     *
     * <p>Summarises org-wide execution highlights for the completed cycle as a
     * sealed, read-only record. Returns a plain narrative string.
     *
     * @param orgId   the organization
     * @param cycleId the completed cycle to summarise
     * @return narrative text (never null; may be a template fallback if LLM is unavailable)
     */
    String generateWeekNarrative(UUID orgId, UUID cycleId);

    /**
     * Generate a team-level summary for a specific manager's team (S4 — team summary).
     *
     * <p>Summarises the manager's team execution for the completed cycle. Returns a
     * plain narrative string.
     *
     * @param orgId     the organization
     * @param cycleId   the completed cycle to summarise
     * @param managerId the manager whose team should be summarised
     * @return narrative text (never null; may be a template fallback if LLM is unavailable)
     */
    String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId);

    /**
     * Generate a team-level summary for a specific manager's team using pre-loaded commitments.
     * Avoids re-querying all org commitments per manager when called in a loop.
     *
     * @param orgId              the organization
     * @param cycleId            the completed cycle to summarise
     * @param managerId          the manager whose team should be summarised
     * @param allOrgCommitments  pre-loaded commitments for the org and cycle
     * @return narrative text (never null; may be a template fallback if LLM is unavailable)
     */
    default String generateTeamSummary(UUID orgId, UUID cycleId, UUID managerId,
                                        java.util.List<com.compass.platform.domain.commit.Commitment> allOrgCommitments) {
        return generateTeamSummary(orgId, cycleId, managerId);
    }

    /**
     * Process a chat message sequence and return a response.
     *
     * @param orgId    the organization context
     * @param messages the conversation history
     * @return chat response
     */
    ChatResponse generateChat(UUID orgId, List<ChatMessage> messages);

    /**
     * Generate an LLM team summary for the My Team AI Summary card.
     *
     * @param actor          the authenticated manager making the request
     * @param cycleWeekStart optional cycle filter
     * @return team summary response, or {@code null} when the LLM is not configured
     */
    TeamSummaryResponse generateTeamSummary(AppUser actor, Instant cycleWeekStart);

    /**
     * Generate a program-level summary of execution trajectory over
     * the last {@code weekCount} reconciled cycles.
     *
     * @param orgId     the organization
     * @param weekCount number of trailing weeks to summarise
     * @return program summary with narrative and timestamp
     */
    ProgramSummaryResponse generateProgramSummary(UUID orgId, com.compass.platform.domain.observatory.dto.TimeScope scope);

    /**
     * Generate a 2-sentence narrative for a single week's execution data.
     *
     * @param orgId   the organization
     * @param cycleId the specific cycle to narrate
     * @return week narrative with text and generation timestamp
     */
    WeekNarrativeResponse generateWeekNarrativeResponse(UUID orgId, UUID cycleId);
}
