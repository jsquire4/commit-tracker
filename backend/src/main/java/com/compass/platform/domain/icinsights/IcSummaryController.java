package com.compass.platform.domain.icinsights;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.icinsights.dto.IcWeekSummaryResponse;
import com.compass.platform.domain.icinsights.dto.PersonalReflectionRequest;
import com.compass.platform.domain.icinsights.dto.PersonalReflectionResponse;
import com.compass.platform.domain.icinsights.dto.RollingHistoryResponse;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import com.compass.platform.shared.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

/**
 * Exposes the IC week summary and personal reflection endpoints for the My Week page.
 *
 * <p>GET  /api/v1/my-week/summary?cycleId={cycleId}
 * <p>POST /api/v1/my-week/reflection
 * <p>GET  /api/v1/my-week/reflection?cycleId={cycleId}
 */
@RestController
@RequestMapping("/api/v1/my-week")
@Transactional(readOnly = true)
public class IcSummaryController {

    private final IcInsightsService icInsightsService;
    private final PersonalReflectionRepository reflectionRepository;
    private final CycleRepository cycleRepository;

    public IcSummaryController(IcInsightsService icInsightsService,
                               PersonalReflectionRepository reflectionRepository,
                               CycleRepository cycleRepository) {
        this.icInsightsService = icInsightsService;
        this.reflectionRepository = reflectionRepository;
        this.cycleRepository = cycleRepository;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<IcWeekSummaryResponse>> getSummary(
            @RequestParam UUID cycleId) {

        AppUser actor = SecurityContextHelper.getCurrentUser();
        IcWeekSummaryResponse response = icInsightsService.computeWeekSummary(
                actor.getId(), actor.getOrg().getId(), cycleId);

        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/rolling-history")
    public ResponseEntity<ApiResponse<RollingHistoryResponse>> getRollingHistory(
            @RequestParam(defaultValue = "4") int weeks) {

        AppUser actor = SecurityContextHelper.getCurrentUser();
        int cappedWeeks = Math.max(1, Math.min(weeks, 12));
        RollingHistoryResponse response = icInsightsService.computeRollingHistory(
                actor.getId(), actor.getOrg().getId(), cappedWeeks);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    // ── Personal Reflection ───────────────────────────────────────────────

    @PostMapping("/reflection")
    @Transactional
    public ResponseEntity<ApiResponse<PersonalReflectionResponse>> saveReflection(
            @Valid @RequestBody PersonalReflectionRequest request) {

        AppUser actor = SecurityContextHelper.getCurrentUser();

        if (actor.getRole() == UserRole.ANALYST) {
            throw new AccessDeniedException("Analysts cannot save personal reflections");
        }

        Cycle cycle = cycleRepository.findById(request.cycleId())
                .orElseThrow(() -> new EntityNotFoundException("Cycle", request.cycleId()));

        if (!cycle.getOrg().getId().equals(actor.getOrg().getId())) {
            throw new AccessDeniedException("Cycle does not belong to the requesting org");
        }

        PersonalReflection reflection = reflectionRepository
                .findByUserIdAndCycleId(actor.getId(), request.cycleId())
                .orElseGet(() -> new PersonalReflection(
                        actor, actor.getOrg(), cycle,
                        request.alignmentSignal(), request.learningNote()));

        boolean isNew = reflection.getId() == null;

        // Upsert — update fields if already exists
        reflection.setAlignmentSignal(request.alignmentSignal());
        reflection.setLearningNote(request.learningNote());

        PersonalReflection saved = reflectionRepository.save(reflection);

        if (isNew) {
            URI location = URI.create("/api/v1/my-week/reflection?cycleId=" + saved.getCycle().getId());
            return ResponseEntity.created(location).body(ApiResponse.of(toResponse(saved)));
        } else {
            return ResponseEntity.ok(ApiResponse.of(toResponse(saved)));
        }
    }

    @GetMapping("/reflection")
    public ResponseEntity<ApiResponse<PersonalReflectionResponse>> getReflection(
            @RequestParam UUID cycleId) {

        AppUser actor = SecurityContextHelper.getCurrentUser();

        Optional<PersonalReflection> found =
                reflectionRepository.findByUserIdAndCycleId(actor.getId(), cycleId);

        if (found.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(ApiResponse.of(toResponse(found.get())));
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static PersonalReflectionResponse toResponse(PersonalReflection r) {
        return new PersonalReflectionResponse(
                r.getId(),
                r.getCycle().getId(),
                r.getAlignmentSignal(),
                r.getLearningNote(),
                r.getCreatedAt()
        );
    }
}
