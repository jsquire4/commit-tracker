package com.compass.platform.domain.dashboard;

import com.compass.platform.domain.briefing.LlmBriefingService;
import com.compass.platform.domain.dashboard.dto.DashboardFilters;
import com.compass.platform.domain.dashboard.dto.DashboardResponse;
import com.compass.platform.domain.dashboard.dto.TeamSummaryResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * Single composite dashboard endpoint.
 * All four dashboard sections query the same underlying data in one pass,
 * avoiding 4 redundant round-trips.
 */
@RestController
@RequestMapping("/api/v1/dashboard")
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class DashboardController {

    private final DashboardService dashboardService;
    private final LlmBriefingService llmBriefingService;

    public DashboardController(DashboardService dashboardService,
                               LlmBriefingService llmBriefingService) {
        this.dashboardService = dashboardService;
        this.llmBriefingService = llmBriefingService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @RequestParam(required = false) Instant cycleWeekStart,
            @RequestParam(required = false) UUID teamMemberId,
            @RequestParam(required = false) UUID rcdoId,
            @RequestParam(required = false) String rcdoType,
            @RequestParam(defaultValue = "false") boolean includeSubtree) {
        AppUser actor = SecurityContextHelper.getCurrentUser();

        DashboardFilters filters = new DashboardFilters(
                cycleWeekStart, teamMemberId, rcdoId, rcdoType, includeSubtree);

        DashboardResponse response = dashboardService.getDashboard(actor, filters);

        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * Returns an LLM-generated team summary for the My Team AI Summary card.
     *
     * <p>When the LLM is not configured, returns 204 No Content so the frontend
     * falls back to the deterministic {@code buildSummary()} function without error.
     */
    @GetMapping("/team-summary")
    public ResponseEntity<ApiResponse<TeamSummaryResponse>> getTeamSummary(
            @RequestParam(required = false) Instant cycleWeekStart) {
        AppUser actor = SecurityContextHelper.getCurrentUser();

        TeamSummaryResponse summary = llmBriefingService.generateTeamSummary(actor, cycleWeekStart);

        if (summary == null) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(ApiResponse.of(summary));
    }
}
