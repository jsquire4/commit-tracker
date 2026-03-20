package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Visibility strategy for DIRECTOR and VP roles.
 * These roles can see themselves and their entire reporting subtree (transitive).
 */
@Component
public class HierarchyVisibility implements VisibilityStrategy {

    private final AppUserRepository userRepository;

    public HierarchyVisibility(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Set<UserRole> supportedRoles() {
        return Set.of(UserRole.DIRECTOR, UserRole.VP);
    }

    @Override
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        Set<UUID> ids = new HashSet<>(userRepository.findSubtreeUserIds(actor.getId()));
        ids.add(actor.getId());
        return ids;
    }
}
