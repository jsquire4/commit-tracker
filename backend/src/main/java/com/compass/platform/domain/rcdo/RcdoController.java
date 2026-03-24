package com.compass.platform.domain.rcdo;

import com.compass.platform.domain.rcdo.dto.CreateDefiningObjectiveRequest;
import com.compass.platform.domain.rcdo.dto.CreateOutcomeRequest;
import com.compass.platform.domain.rcdo.dto.CreateRallyCryRequest;
import com.compass.platform.domain.rcdo.dto.RallyCryResponse;
import com.compass.platform.domain.rcdo.dto.RcdoTreeResponse;
import com.compass.platform.domain.rcdo.dto.UpdateRcdoRequest;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.security.SecurityContextHelper;
import com.compass.platform.shared.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rcdo")
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class RcdoController {

    private final RcdoService rcdoService;
    private final RallyCryRepository rallyCryRepository;

    public RcdoController(RcdoService rcdoService, RallyCryRepository rallyCryRepository) {
        this.rcdoService = rcdoService;
        this.rallyCryRepository = rallyCryRepository;
    }

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<RcdoTreeResponse>> getTree(
            @RequestParam(required = false) String q) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        RcdoTreeResponse tree = (q != null && !q.isBlank())
                ? rcdoService.searchTree(actor.getOrg().getId(), q.trim())
                : rcdoService.getTree(actor.getOrg().getId());
        return ResponseEntity.ok(ApiResponse.of(tree));
    }

    @GetMapping("/rally-cries")
    public ResponseEntity<ApiResponse<List<RallyCryResponse>>> listRallyCries() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        List<RallyCry> rallyCries = rallyCryRepository
                .findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(actor.getOrg().getId());
        List<RallyCryResponse> responses = rallyCries.stream()
                .map(rc -> new RallyCryResponse(rc.getId(), rc.getTitle(), rc.getDescription(),
                        rc.getSortOrder(), rc.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    @PostMapping("/rally-cries")
    public ResponseEntity<ApiResponse<RallyCryResponse>> createRallyCry(
            @Valid @RequestBody CreateRallyCryRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        RallyCry saved = rcdoService.createRallyCry(
                actor.getOrg().getId(), request.title(), request.description(), actor);

        RallyCryResponse response = new RallyCryResponse(
                saved.getId(), saved.getTitle(), saved.getDescription(),
                saved.getSortOrder(), saved.getCreatedAt());

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(response));
    }

    @PostMapping("/defining-objectives")
    public ResponseEntity<ApiResponse<Object>> createDefiningObjective(
            @Valid @RequestBody CreateDefiningObjectiveRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        DefiningObjective saved = rcdoService.createDefiningObjective(
                actor.getOrg().getId(), request.rallyCryId(),
                request.title(), request.description(), request.ownerUserId(), actor);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/../defining-objectives/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(saved));
    }

    @PostMapping("/outcomes")
    public ResponseEntity<ApiResponse<Object>> createOutcome(
            @Valid @RequestBody CreateOutcomeRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Outcome saved = rcdoService.createOutcome(
                actor.getOrg().getId(), request.definingObjectiveId(),
                request.title(), request.description(), request.ownerUserId(), actor);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/../outcomes/{id}")
                .buildAndExpand(saved.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(saved));
    }

    /**
     * Update an RCDO node.
     * type: "rally-cries", "defining-objectives", or "outcomes"
     */
    @PutMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<Object>> updateRcdo(
            @PathVariable String type,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRcdoRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Object updated = switch (type) {
            case "rally-cries" -> rcdoService.updateRallyCry(
                    id, request.title(), request.description(), actor);
            case "defining-objectives" -> rcdoService.updateDefiningObjective(
                    id, request.title(), request.description(), request.ownerUserId(), actor);
            case "outcomes" -> rcdoService.updateOutcome(
                    id, request.title(), request.description(), request.ownerUserId(), actor);
            default -> throw new IllegalArgumentException("Unknown RCDO type: " + type
                    + ". Must be one of: rally-cries, defining-objectives, outcomes");
        };
        return ResponseEntity.ok(ApiResponse.of(updated));
    }

    /**
     * Soft-delete (archive) an RCDO node.
     * Returns a warning count of commitments still referencing this node.
     */
    @DeleteMapping("/{type}/{id}")
    public ResponseEntity<ApiResponse<ArchiveResponse>> archiveRcdo(
            @PathVariable String type,
            @PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        int warningCount = switch (type) {
            case "rally-cries" -> rcdoService.archiveRallyCry(id, actor);
            case "defining-objectives" -> rcdoService.archiveDefiningObjective(id, actor);
            case "outcomes" -> rcdoService.archiveOutcome(id, actor);
            default -> throw new IllegalArgumentException("Unknown RCDO type: " + type
                    + ". Must be one of: rally-cries, defining-objectives, outcomes");
        };

        String message = warningCount == 0
                ? "Archived successfully"
                : warningCount + " commitment(s) still reference this item";
        return ResponseEntity.ok(ApiResponse.of(new ArchiveResponse(warningCount, message)));
    }

    public record ArchiveResponse(int referencingCommitmentCount, String message) {}

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.of(Map.of("error", ex.getMessage())));
    }
}
