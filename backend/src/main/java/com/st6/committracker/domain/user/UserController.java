package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.security.SecurityContextHelper;
import com.st6.committracker.security.VisibilityEnforcer;
import com.st6.committracker.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;
    private final TeamActivationService teamActivationService;

    public UserController(AppUserRepository userRepository, VisibilityEnforcer visibilityEnforcer,
                          TeamActivationService teamActivationService) {
        this.userRepository = userRepository;
        this.visibilityEnforcer = visibilityEnforcer;
        this.teamActivationService = teamActivationService;
    }

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

    /**
     * Activate the commit module for the target user and their subtree.
     * Requires DIRECTOR+ role.
     */
    @PostMapping("/{userId}/activate")
    public ResponseEntity<Void> activateTeam(@PathVariable UUID userId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        teamActivationService.activateTeam(userId, actor);
        return ResponseEntity.noContent().build();
    }

    /**
     * Deactivate the commit module for the target user.
     * Requires DIRECTOR+ role.
     */
    @PostMapping("/{userId}/deactivate")
    public ResponseEntity<Void> deactivateTeam(@PathVariable UUID userId) {
        AppUser actor = SecurityContextHelper.getCurrentUser();
        teamActivationService.deactivateTeam(userId, actor);
        return ResponseEntity.noContent().build();
    }

    private UserResponse toResponse(AppUser user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                user.getReportsTo() != null ? user.getReportsTo().getId() : null,
                user.getReportsTo() != null ? user.getReportsTo().getDisplayName() : null,
                user.isActive()
        );
    }

    public record UserResponse(
        UUID id,
        String email,
        String displayName,
        UserRole role,
        UUID reportsTo,
        String reportsToDisplayName,
        boolean isActive
    ) {}
}
