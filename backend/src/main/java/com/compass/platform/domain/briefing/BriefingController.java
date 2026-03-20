package com.compass.platform.domain.briefing;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.briefing.dto.BriefingResponse;
import com.compass.platform.domain.briefing.dto.ChatRequest;
import com.compass.platform.domain.briefing.dto.ChatResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for the executive briefing feature.
 *
 * <p>Exposes endpoints for generating narrative briefings from observatory data
 * and for conversational chat interactions. Both endpoints require authentication;
 * the caller's org is resolved from the security context.
 */
@RestController
@RequestMapping("/api/v1/briefing")
public class BriefingController {

    private final BriefingService briefingService;

    public BriefingController(BriefingService briefingService) {
        this.briefingService = briefingService;
    }

    /**
     * GET /api/v1/briefing?cycleId={id}
     * Generate an executive briefing for the caller's org and the specified cycle.
     * If cycleId is omitted, the service uses the most recent reconciled cycle.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<BriefingResponse>> getBriefing(
            @RequestParam(required = false) UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertBriefingAccess(actor);
        UUID orgId = actor.getOrg().getId();
        BriefingResponse briefing = briefingService.generateBriefing(orgId, cycleId);
        return ResponseEntity.ok(ApiResponse.of(briefing));
    }

    /**
     * POST /api/v1/briefing/chat
     * Accept a chat request with a conversation history and return a response.
     */
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<ChatResponse>> chat(
            @Valid @RequestBody ChatRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertBriefingAccess(actor);
        UUID orgId = actor.getOrg().getId();
        ChatResponse response = briefingService.generateChat(orgId, request.messages());
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Enforce briefing access: only MANAGER and above may call briefing endpoints.
     */
    private void assertBriefingAccess(AppUser actor) {
        UserRole role = actor.getRole();
        if (role == UserRole.ANALYST || role == UserRole.EMPLOYEE) {
            throw new AccessDeniedException("Briefing access requires MANAGER or above");
        }
    }
}
