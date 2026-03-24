package com.compass.platform.domain.icinsights;

import com.compass.platform.domain.icinsights.dto.MyStoryResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the IC longitudinal story for the My Story page.
 *
 * <p>GET /api/v1/my-story?weeks=12
 *
 * <p>{@code weeks} defaults to 12, is capped at 52.
 */
@RestController
@RequestMapping("/api/v1/my-story")
@Transactional(readOnly = true)
public class MyStoryController {

    private static final int MAX_STORY_WEEKS = 52;

    private final IcInsightsService icInsightsService;

    public MyStoryController(IcInsightsService icInsightsService) {
        this.icInsightsService = icInsightsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<MyStoryResponse>> getMyStory(
            @RequestParam(defaultValue = "12") int weeks) {

        int cappedWeeks = Math.max(1, Math.min(weeks, MAX_STORY_WEEKS));
        AppUser actor = SecurityContextHelper.getCurrentUser();

        MyStoryResponse response = icInsightsService.computeMyStory(
                actor.getId(), actor.getOrg().getId(), cappedWeeks);

        return ResponseEntity.ok(ApiResponse.of(response));
    }
}
