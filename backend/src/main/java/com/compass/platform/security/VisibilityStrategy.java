package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;

import java.util.Set;
import java.util.UUID;

/**
 * Interface for role-specific visibility resolution.
 * Each implementation handles one UserRole (or group of related roles).
 */
public interface VisibilityStrategy {

    /** Which roles this strategy handles. */
    Set<UserRole> supportedRoles();

    /** Pre-compute the set of user IDs visible to this actor. Called once per request. */
    Set<UUID> computeVisibleUserIds(AppUser actor);
}
