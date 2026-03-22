package com.compass.platform.domain.briefing;

import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.ChatRequest.ChatMessage;
import com.compass.platform.domain.briefing.dto.ChatResponse;

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
     * Process a chat message sequence and return a response.
     *
     * @param orgId    the organization context
     * @param messages the conversation history
     * @return chat response
     */
    ChatResponse generateChat(UUID orgId, List<ChatMessage> messages);
}
