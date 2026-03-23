package com.compass.platform.domain.briefing;

import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleService;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/feedback")
public class NarrativeFeedbackController {

    private final NarrativeFeedbackRepository feedbackRepository;
    private final CycleService cycleService;

    public NarrativeFeedbackController(NarrativeFeedbackRepository feedbackRepository, CycleService cycleService) {
        this.feedbackRepository = feedbackRepository;
        this.cycleService = cycleService;
    }

    public record FeedbackRequest(String scope, String cycleId, String vote) {}

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, String>>> submitFeedback(@RequestBody FeedbackRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        UUID cycleUuid = UUID.fromString(request.cycleId());
        Cycle cycle = cycleService.getCycle(cycleUuid, actor);

        var existing = feedbackRepository.findByOrgIdAndUserIdAndScopeAndCycleId(
                actor.getOrg().getId(), actor.getId(), request.scope(), cycle.getId());

        if (existing.isPresent()) {
            NarrativeFeedback fb = existing.get();
            fb.setVote(request.vote());
            feedbackRepository.save(fb);
        } else {
            feedbackRepository.save(new NarrativeFeedback(
                    actor.getOrg(), actor, request.scope(), cycle, request.vote()));
        }

        return ResponseEntity.ok(ApiResponse.of(Map.of("status", "ok")));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, String>>> getFeedback(
            @RequestParam String scope,
            @RequestParam String cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        UUID cycleUuid = UUID.fromString(cycleId);

        var existing = feedbackRepository.findByOrgIdAndUserIdAndScopeAndCycleId(
                actor.getOrg().getId(), actor.getId(), scope, cycleUuid);

        String vote = existing.map(NarrativeFeedback::getVote).orElse(null);
        return ResponseEntity.ok(ApiResponse.of(Map.of("vote", vote != null ? vote : "")));
    }
}
