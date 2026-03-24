package com.compass.platform.domain.briefing;

import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleService;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
public class NarrativeFeedbackController {

    private static final Set<String> VALID_SCOPES = Set.of(
            "BRIEFING", "TEAM_SUMMARY", "PROGRAM_SUMMARY", "WEEK_NARRATIVE");

    private final NarrativeFeedbackRepository feedbackRepository;
    private final CycleService cycleService;

    public NarrativeFeedbackController(NarrativeFeedbackRepository feedbackRepository, CycleService cycleService) {
        this.feedbackRepository = feedbackRepository;
        this.cycleService = cycleService;
    }

    public record FeedbackRequest(
            @NotBlank String scope,
            @NotBlank String cycleId,
            @NotBlank @Pattern(regexp = "up|down") String vote) {}

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        if (!VALID_SCOPES.contains(request.scope())) {
            return ResponseEntity.badRequest().body(ApiResponse.of(Map.of("error", "Invalid scope")));
        }

        UUID cycleUuid;
        try {
            cycleUuid = UUID.fromString(request.cycleId());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.of(Map.of("error", "Invalid cycleId")));
        }

        AppUser actor = SecurityContextHelper.getCurrentUser();
        Cycle cycle = cycleService.getCycle(cycleUuid, actor);

        var existing = feedbackRepository.findByOrgIdAndUserIdAndScopeAndCycleId(
                actor.getOrg().getId(), actor.getId(), request.scope(), cycle.getId());

        try {
            if (existing.isPresent()) {
                NarrativeFeedback fb = existing.get();
                fb.setVote(request.vote());
                feedbackRepository.save(fb);
            } else {
                feedbackRepository.save(new NarrativeFeedback(
                        actor.getOrg(), actor, request.scope(), cycle, request.vote()));
            }
        } catch (DataIntegrityViolationException e) {
            // Race condition: concurrent insert hit unique constraint — re-fetch and update
            var retry = feedbackRepository.findByOrgIdAndUserIdAndScopeAndCycleId(
                    actor.getOrg().getId(), actor.getId(), request.scope(), cycle.getId());
            if (retry.isPresent()) {
                retry.get().setVote(request.vote());
                feedbackRepository.save(retry.get());
            }
        }

        return ResponseEntity.ok(ApiResponse.of(Map.of("status", "ok")));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> getFeedback(
            @RequestParam String scope,
            @RequestParam String cycleId) {
        if (!VALID_SCOPES.contains(scope)) {
            return ResponseEntity.badRequest().body(ApiResponse.of(Map.of("error", "Invalid scope")));
        }

        UUID cycleUuid;
        try {
            cycleUuid = UUID.fromString(cycleId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.of(Map.of("error", "Invalid cycleId")));
        }

        AppUser actor = SecurityContextHelper.getCurrentUser();

        var existing = feedbackRepository.findByOrgIdAndUserIdAndScopeAndCycleId(
                actor.getOrg().getId(), actor.getId(), scope, cycleUuid);

        String vote = existing.map(NarrativeFeedback::getVote).orElse(null);
        return ResponseEntity.ok(ApiResponse.of(Map.of("vote", vote != null ? vote : "")));
    }
}
