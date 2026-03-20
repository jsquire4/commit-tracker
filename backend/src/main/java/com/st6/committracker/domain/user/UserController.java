package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.observatory.CostBand;
import com.st6.committracker.domain.observatory.CostBandRepository;
import com.st6.committracker.domain.user.dto.CreateOrgRequest;
import com.st6.committracker.domain.user.dto.CreateUserRequest;
import com.st6.committracker.domain.user.dto.UpdateUserRequest;
import com.st6.committracker.security.SecurityContextHelper;
import com.st6.committracker.security.VisibilityEnforcer;
import com.st6.committracker.shared.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@Transactional(readOnly = true)
public class UserController {

    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final TeamActivationService teamActivationService;
    private final UserManagementService userManagementService;
    private final CostBandRepository costBandRepository;

    public UserController(AppUserRepository userRepository, VisibilityEnforcer visibilityEnforcer,
                          TeamActivationService teamActivationService,
                          UserManagementService userManagementService,
                          CostBandRepository costBandRepository) {
        this.userRepository = userRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.teamActivationService = teamActivationService;
        this.userManagementService = userManagementService;
        this.costBandRepository = costBandRepository;
    }

    // ─── Read Endpoints (existing) ────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.of(toResponse(actor)));
    }

    @GetMapping("/team")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getTeam() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        List<AppUser> directReports = userRepository.findDirectReports(
                actor.getOrg().getId(), actor.getId());
        List<UserResponse> responses = directReports.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getOrgTree() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        UserRole role = actor.getRole();
        if (role == UserRole.EMPLOYEE || role == UserRole.MANAGER || role == UserRole.ANALYST) {
            throw new AccessDeniedException("DIRECTOR or above required to view the full org tree");
        }

        List<UUID> subtreeIds = userRepository.findSubtreeUserIds(actor.getId());
        List<AppUser> subtree = subtreeIds.isEmpty()
                ? List.of()
                : userRepository.findAllById(subtreeIds);

        List<UserResponse> responses = subtree.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    // ─── User CRUD (new) ─────────────────────────────────────────────────────

    /** List users in org. MANAGER/DIRECTOR see subtree; VP/EXECUTIVE see all. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        List<AppUser> users = userManagementService.listUsers(actor);
        List<UserResponse> responses = users.stream().map(this::toResponse).toList();
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    /** Create a new user. MANAGER+ required. */
    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        AppUser created = userManagementService.createUser(request, actor);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(toResponse(created)));
    }

    /** Update an existing user. MANAGER+ with subtree access. */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        AppUser updated = userManagementService.updateUser(id, request, actor);
        return ResponseEntity.ok(ApiResponse.of(toResponse(updated)));
    }

    /** Deactivate (soft-delete) a user. MANAGER+ with subtree access. */
    @PostMapping("/{id}/archive")
    @Transactional
    public ResponseEntity<Void> archiveUser(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        userManagementService.archiveUser(id, actor);
        return ResponseEntity.noContent().build();
    }

    /** Reactivate a user. MANAGER+ with subtree access. */
    @PostMapping("/{id}/restore")
    @Transactional
    public ResponseEntity<Void> restoreUser(@PathVariable UUID id) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        userManagementService.restoreUser(id, actor);
        return ResponseEntity.noContent().build();
    }

    // ─── Cost Bands ──────────────────────────────────────────────────────────

    /** List all cost bands for the current org. */
    @GetMapping("/cost-bands")
    public ResponseEntity<ApiResponse<List<CostBandResponse>>> listCostBands() {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        List<CostBand> bands = costBandRepository.findByOrgIdOrderByTierAsc(actor.getOrg().getId());
        List<CostBandResponse> responses = bands.stream()
                .map(b -> new CostBandResponse(b.getId(), b.getName(), b.getTier()))
                .toList();
        return ResponseEntity.ok(ApiResponse.of(responses));
    }

    // ─── Team Activation (existing) ───────────────────────────────────────────

    @PostMapping("/{userId}/activate")
    @Transactional
    public ResponseEntity<Void> activateTeam(@PathVariable UUID userId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        teamActivationService.activateTeam(userId, actor);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{userId}/deactivate")
    @Transactional
    public ResponseEntity<Void> deactivateTeam(@PathVariable UUID userId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        teamActivationService.deactivateTeam(userId, actor);
        return ResponseEntity.noContent().build();
    }

    // ─── Org Creation ─────────────────────────────────────────────────────────

    @PostMapping("/orgs")
    @Transactional
    public ResponseEntity<ApiResponse<OrgResponse>> createOrg(
            @Valid @RequestBody CreateOrgRequest request) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        Org created = userManagementService.createOrg(request, actor);

        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/users/orgs/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(ApiResponse.of(
                new OrgResponse(created.getId(), created.getName(), created.getSlug(), created.getTimezone())));
    }

    // ─── Response DTOs ────────────────────────────────────────────────────────

    private UserResponse toResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getReportsTo() != null ? user.getReportsTo().getId() : null,
                user.getReportsTo() != null ? user.getReportsTo().getDisplayName() : null,
                user.isActive(),
                user.getCostBand() != null ? user.getCostBand().getId() : null,
                user.getCostBand() != null ? user.getCostBand().getName() : null,
                user.getCostBand() != null ? user.getCostBand().getTier() : null,
                user.getWeeklyCapacityHours()
        );
    }

    public record UserResponse(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        UUID reportsTo,
        String reportsToDisplayName,
        boolean isActive,
        UUID costBandId,
        String costBandName,
        Integer costBandTier,
        java.math.BigDecimal weeklyCapacityHours
    ) {}

    public record CostBandResponse(UUID id, String name, int tier) {}

    public record OrgResponse(UUID id, String name, String slug, String timezone) {}
}
