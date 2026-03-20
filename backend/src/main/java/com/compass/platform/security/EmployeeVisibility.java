package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * Visibility strategy for EMPLOYEE role.
 * Employees can only see their own commitments.
 */
@Component
public class EmployeeVisibility implements VisibilityStrategy {

    @Override
    public Set<UserRole> supportedRoles() {
        return Set.of(UserRole.EMPLOYEE);
    }

    @Override
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        return Set.of(actor.getId());
    }
}
