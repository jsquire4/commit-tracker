package com.st6.committracker.security;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Visibility strategy for MANAGER role.
 * Managers can see themselves and their direct reports.
 */
@Component
public class ManagerVisibility implements VisibilityStrategy {

    private final AppUserRepository userRepository;

    public ManagerVisibility(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Set<UserRole> supportedRoles() {
        return Set.of(UserRole.MANAGER);
    }

    @Override
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        Set<UUID> ids = new HashSet<>();
        ids.add(actor.getId());
        userRepository.findByReportsToId(actor.getId()).forEach(u -> ids.add(u.getId()));
        return ids;
    }
}
