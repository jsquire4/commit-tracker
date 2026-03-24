package com.compass.platform.domain.observatory;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.briefing.BriefingService;
import com.compass.platform.domain.briefing.dto.ProgramSummaryResponse;
import com.compass.platform.domain.observatory.dto.CarryForwardChain;
import com.compass.platform.domain.observatory.dto.CostWeightedSignal;
import com.compass.platform.domain.observatory.dto.DisplacementSummary;
import com.compass.platform.domain.observatory.dto.ProgramHeatmapResponse;
import com.compass.platform.domain.observatory.dto.DriftReport;
import com.compass.platform.domain.observatory.dto.ExecutiveHealthResponse;
import com.compass.platform.domain.observatory.dto.IntegrityReport;
import com.compass.platform.domain.observatory.dto.ObservatoryConfigResponse;
import com.compass.platform.domain.observatory.dto.PortfolioComparisonResponse;
import com.compass.platform.domain.observatory.dto.PortfolioHealthResponse;
import com.compass.platform.domain.observatory.dto.ObservatoryDashboardResponse;
import com.compass.platform.domain.observatory.dto.SignalsSummaryResponse;
import com.compass.platform.domain.observatory.dto.UpdateObservatoryConfigRequest;
import com.compass.platform.domain.observatory.dto.WeekNarrativeResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for the Execution Observatory.
 *
 * <p>Exposes executive-level analytics for DIRECTOR, VP, and EXECUTIVE roles.
 * All endpoints are thin: they validate the caller's role, resolve the org ID from
 * the security context, delegate to the appropriate service, and wrap the result in
 * {@link ApiResponse}. The one exception is {@code /health}, whose composition logic
 * lives in {@link ExecutiveHealthComposer}.
 *
 * <p>All reads are covered by a class-level {@code @Transactional(readOnly = true)}.
 * The config PUT overrides to a read-write transaction for the update operation.
 */
@RestController
@RequestMapping("/api/v1/observatory")
@Transactional(readOnly = true)
public class ObservatoryController {

    private final ExecutiveHealthComposer healthComposer;
    private final AnalyticsService analyticsService;
    private final DriftDetectionService driftDetectionService;
    private final DisplacementService displacementService;
    private final PortfolioService portfolioService;
    private final ObservatoryConfigRepository configRepository;
    private final OrgRepository orgRepository;
    private final BriefingService briefingService;

    public ObservatoryController(ExecutiveHealthComposer healthComposer,
                                 AnalyticsService analyticsService,
                                 DriftDetectionService driftDetectionService,
                                 DisplacementService displacementService,
                                 PortfolioService portfolioService,
                                 ObservatoryConfigRepository configRepository,
                                 OrgRepository orgRepository,
                                 BriefingService briefingService) {
        this.healthComposer = healthComposer;
        this.analyticsService = analyticsService;
        this.driftDetectionService = driftDetectionService;
        this.displacementService = displacementService;
        this.portfolioService = portfolioService;
        this.configRepository = configRepository;
        this.orgRepository = orgRepository;
        this.briefingService = briefingService;
    }

    // ═══════════════════════════════════════════════════════════════
    // Health
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/health
     * Org-level execution health summary (alignment, completion, drift, integrity, per-unit breakdown).
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<ExecutiveHealthResponse>> getHealth(
            @RequestParam(defaultValue = "12") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(healthComposer.computeHealth(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Dashboard (composite)
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/dashboard
     * Composite endpoint returning health + alignment trend + completion trend in one call.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<ObservatoryDashboardResponse>> getDashboard(
            @RequestParam(defaultValue = "26") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();

        ExecutiveHealthResponse health = healthComposer.computeHealth(orgId, weekCount);
        var alignmentTrend = analyticsService.computeAlignmentTrend(orgId, weekCount);
        var completionTrend = analyticsService.computeCompletionTrend(orgId, weekCount);

        return ResponseEntity.ok(ApiResponse.of(new ObservatoryDashboardResponse(health, alignmentTrend, completionTrend)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Drift
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/drift
     * Drift report for the org — signals at EMERGING, SUSTAINED, and STRUCTURAL severity.
     */
    @GetMapping("/drift")
    public ResponseEntity<ApiResponse<DriftReport>> getDrift() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(driftDetectionService.detectDrift(orgId)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Alignment trend
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/alignment-trend
     * Alignment category trend data for sparklines.
     * Optionally scoped to a specific manager's team via {@code managerId}.
     */
    @GetMapping("/alignment-trend")
    public ResponseEntity<ApiResponse<?>> getAlignmentTrend(
            @RequestParam(defaultValue = "12") int weekCount,
            @RequestParam(required = false) UUID managerId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();

        if (managerId != null) {
            return ResponseEntity.ok(ApiResponse.of(
                    analyticsService.computeTeamAlignmentTrend(orgId, managerId, weekCount)));
        }
        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeAlignmentTrend(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Completion trend
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/completion-trend
     * Completion rate trend data.
     * Optionally scoped to a specific manager's team via {@code managerId}.
     */
    @GetMapping("/completion-trend")
    public ResponseEntity<ApiResponse<?>> getCompletionTrend(
            @RequestParam(defaultValue = "12") int weekCount,
            @RequestParam(required = false) UUID managerId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();

        if (managerId != null) {
            return ResponseEntity.ok(ApiResponse.of(
                    analyticsService.computeTeamCompletionTrend(orgId, managerId, weekCount)));
        }
        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeCompletionTrend(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Cost-impact
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/cost-impact
     * Cost-weighted misalignment report for a specific cycle.
     */
    @GetMapping("/cost-impact")
    public ResponseEntity<ApiResponse<List<CostWeightedSignal>>> getCostImpact(
            @RequestParam UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeCostWeightedMisalignment(orgId, cycleId)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Displacement
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/displacement
     * Displacement aggregation report for the org over the trailing week window.
     */
    @GetMapping("/displacement")
    public ResponseEntity<ApiResponse<DisplacementSummary>> getDisplacement(
            @RequestParam(defaultValue = "12") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                displacementService.aggregateDisplacements(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Signals summary
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/signals-summary
     * Composed signal cards spanning drift patterns, displacement cascades,
     * specificity anomalies, and work-distribution concentration risk.
     */
    @GetMapping("/signals-summary")
    public ResponseEntity<ApiResponse<SignalsSummaryResponse>> getSignalsSummary(
            @RequestParam(defaultValue = "26") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();

        DriftReport driftReport = driftDetectionService.detectDrift(orgId);
        IntegrityReport integrityReport = driftDetectionService.detectSignalIntegrity(orgId, null);
        com.compass.platform.domain.observatory.dto.DisplacementSummary displacementSummary =
                displacementService.aggregateDisplacements(orgId, weekCount);

        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeSignalsSummary(orgId, weekCount, driftReport, integrityReport, displacementSummary)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Carry-forward chains
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/carry-chains
     * Carry-forward chain analysis for a specific cycle.
     */
    @GetMapping("/carry-chains")
    public ResponseEntity<ApiResponse<List<CarryForwardChain>>> getCarryChains(
            @RequestParam UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeCarryForwardChains(orgId, cycleId)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Program heatmap
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/program-heatmap
     * Per-manager per-cycle dominant CHESS category heatmap, with per-person drill-down.
     */
    @GetMapping("/program-heatmap")
    public ResponseEntity<ApiResponse<ProgramHeatmapResponse>> getProgramHeatmap(
            @RequestParam(defaultValue = "26") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                analyticsService.computeProgramHeatmap(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Program summary (LLM narrative)
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/program-summary
     * LLM-generated 2-3 sentence narrative summarising the organisation's
     * execution trajectory over the last {@code weekCount} reconciled cycles.
     * Falls back to a deterministic template when no LLM key is configured.
     */
    @GetMapping("/program-summary")
    public ResponseEntity<ApiResponse<ProgramSummaryResponse>> getProgramSummary(
            @RequestParam(defaultValue = "26") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                briefingService.generateProgramSummary(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Week narrative (SpeechBubble LLM)
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/week-narrative?cycleId=...
     * LLM-generated 2-sentence narrative for a single week's execution data.
     * Used by the SpeechBubble popover in the Execution Trend chart.
     * Falls back to a deterministic template when the LLM is not configured.
     */
    @GetMapping("/week-narrative")
    public ResponseEntity<ApiResponse<WeekNarrativeResponse>> getWeekNarrative(
            @RequestParam UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                briefingService.generateWeekNarrativeResponse(orgId, cycleId)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Signal integrity
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/integrity
     * Signal integrity flags for the given cycle (or the most recent cycle if omitted).
     */
    @GetMapping("/integrity")
    public ResponseEntity<ApiResponse<IntegrityReport>> getIntegrity(
            @RequestParam(required = false) UUID cycleId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        UUID orgId = actor.getOrg().getId();
        return ResponseEntity.ok(ApiResponse.of(
                driftDetectionService.detectSignalIntegrity(orgId, cycleId)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Config
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/config
     * Returns the observatory configuration for the caller's org.
     * If no config has been saved yet, returns the default values.
     */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<ObservatoryConfigResponse>> getConfig() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        Org org = actor.getOrg();
        ObservatoryConfig config = configRepository.findByOrgId(org.getId())
                .orElseGet(() -> ObservatoryConfig.builder().org(org).build());
        return ResponseEntity.ok(ApiResponse.of(toConfigResponse(config)));
    }

    /**
     * PUT /api/v1/observatory/config
     * Update observatory configuration thresholds. EXECUTIVE role only.
     */
    @PutMapping("/config")
    @Transactional
    public ResponseEntity<ApiResponse<ObservatoryConfigResponse>> updateConfig(
            @RequestBody UpdateObservatoryConfigRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        if (actor.getRole() != UserRole.EXECUTIVE) {
            throw new AccessDeniedException("Only EXECUTIVE users may update observatory configuration");
        }

        Org org = actor.getOrg();
        ObservatoryConfig config = configRepository.findByOrgId(org.getId())
                .orElseGet(() -> {
                    ObservatoryConfig fresh = ObservatoryConfig.builder().org(org).build();
                    return configRepository.save(fresh);
                });

        applyUpdate(config, request);
        ObservatoryConfig saved = configRepository.save(config);
        return ResponseEntity.ok(ApiResponse.of(toConfigResponse(saved)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Portfolio
    // ═══════════════════════════════════════════════════════════════

    /**
     * GET /api/v1/observatory/portfolio
     * Portfolio-level health across all orgs in the caller's portfolio.
     * The portfolio is resolved from the caller's org.
     */
    @GetMapping("/portfolio")
    public ResponseEntity<ApiResponse<PortfolioHealthResponse>> getPortfolio() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        Org org = actor.getOrg();
        if (org.getPortfolio() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.of(null));
        }
        UUID portfolioId = org.getPortfolio().getId();
        return ResponseEntity.ok(ApiResponse.of(portfolioService.getPortfolioHealth(portfolioId)));
    }

    /**
     * GET /api/v1/observatory/portfolio/comparison
     * Alignment trend comparison across all portcos in the caller's portfolio.
     */
    @GetMapping("/portfolio/comparison")
    public ResponseEntity<ApiResponse<PortfolioComparisonResponse>> getPortfolioComparison(
            @RequestParam(defaultValue = "12") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        if (actor.getOrg().getPortfolio() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.of(null));
        }
        UUID portfolioId = actor.getOrg().getPortfolio().getId();
        PortfolioComparisonResponse response = portfolioService.getPortfolioComparison(portfolioId, weekCount);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    /**
     * GET /api/v1/observatory/portfolio/{orgId}
     * Drill into a specific portco's health within the caller's portfolio.
     */
    @GetMapping("/portfolio/{orgId}")
    public ResponseEntity<ApiResponse<ExecutiveHealthResponse>> getPortfolioOrg(
            @PathVariable UUID orgId,
            @RequestParam(defaultValue = "12") int weekCount) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        assertObservatoryAccess(actor);
        Org requestedOrg = orgRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Org not found: " + orgId));
        if (actor.getOrg().getPortfolio() == null || requestedOrg.getPortfolio() == null
                || !actor.getOrg().getPortfolio().getId().equals(requestedOrg.getPortfolio().getId())) {
            throw new AccessDeniedException("Access denied to this organization's data");
        }
        return ResponseEntity.ok(ApiResponse.of(healthComposer.computeHealth(orgId, weekCount)));
    }

    // ═══════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════

    /**
     * Enforce observatory access: only DIRECTOR, VP, and EXECUTIVE may call these endpoints.
     */
    private void assertObservatoryAccess(AppUser actor) {
        UserRole role = actor.getRole();
        if (role != UserRole.DIRECTOR && role != UserRole.VP && role != UserRole.EXECUTIVE) {
            throw new AccessDeniedException("Observatory access requires DIRECTOR or above");
        }
    }

    private ObservatoryConfigResponse toConfigResponse(ObservatoryConfig config) {
        return new ObservatoryConfigResponse(
                config.getId(),
                config.getOrg() != null ? config.getOrg().getId() : null,
                config.getDriftEmergingWeeks(),
                config.getDriftSustainedWeeks(),
                config.getDriftStructuralWeeks(),
                config.getStrategicAlignmentTarget(),
                config.getMisalignmentWarningPct(),
                config.getDarkWorkWarningPct(),
                config.getConcentrationRiskPct(),
                config.getUniformityThreshold(),
                config.getCreatedAt(),
                config.getUpdatedAt()
        );
    }

    private void applyUpdate(ObservatoryConfig config, UpdateObservatoryConfigRequest req) {
        if (req.driftEmergingWeeks() != null) {
            config.setDriftEmergingWeeks(req.driftEmergingWeeks());
        }
        if (req.driftSustainedWeeks() != null) {
            config.setDriftSustainedWeeks(req.driftSustainedWeeks());
        }
        if (req.driftStructuralWeeks() != null) {
            config.setDriftStructuralWeeks(req.driftStructuralWeeks());
        }
        if (req.strategicAlignmentTarget() != null) {
            config.setStrategicAlignmentTarget(req.strategicAlignmentTarget());
        }
        if (req.misalignmentWarningPct() != null) {
            config.setMisalignmentWarningPct(req.misalignmentWarningPct());
        }
        if (req.darkWorkWarningPct() != null) {
            config.setDarkWorkWarningPct(req.darkWorkWarningPct());
        }
        if (req.concentrationRiskPct() != null) {
            config.setConcentrationRiskPct(req.concentrationRiskPct());
        }
        if (req.uniformityThreshold() != null) {
            config.setUniformityThreshold(req.uniformityThreshold());
        }
    }
}
