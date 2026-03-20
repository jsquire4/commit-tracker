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
     * Generate an executive briefing for the given org and cycle.
     *
     * @param orgId   the organization to brief
     * @param cycleId the cycle to analyse (uses most recent reconciled cycle if null)
     * @return assembled briefing with narrative, suggestions, and citations
     */
    BriefingResponse generateBriefing(UUID orgId, UUID cycleId);

    /**
     * Process a chat message sequence and return a response.
     *
     * @param orgId    the organization context
     * @param messages the conversation history
     * @return chat response
     */
    ChatResponse generateChat(UUID orgId, List<ChatMessage> messages);
}
