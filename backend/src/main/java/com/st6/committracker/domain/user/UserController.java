package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.security.SecurityContextHelper;
import com.st6.committracker.security.VisibilityEnforcer;
import com.st6.committracker.shared.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final AppUserRepository userRepository;
    private final VisibilityEnforcer visibilityEnforcer;

    public UserController(AppUserRepository userRepository, VisibilityEnforcer visibilityEnforcer) {
        this.userRepository = userRepository;
        this.visibilityEnforcer = visibilityEnforcer;
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
