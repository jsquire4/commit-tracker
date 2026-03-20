package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Visibility strategy for EXECUTIVE role.
 * Executives can see all active users in their organization.
 */
@Component
public class ExecutiveVisibility implements VisibilityStrategy {

    private final AppUserRepository userRepository;

    public ExecutiveVisibility(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Set<UserRole> supportedRoles() {
        return Set.of(UserRole.EXECUTIVE);
    }

    @Override
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        return userRepository.findByOrgIdAndIsActiveTrue(actor.getOrg().getId())
                .stream()
                .map(AppUser::getId)
                .collect(Collectors.toSet());
    }
}
