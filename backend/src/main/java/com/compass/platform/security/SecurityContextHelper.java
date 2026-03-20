package com.compass.platform.security;

import com.compass.platform.domain.user.AppUser;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Static helper to extract the authenticated AppUser from Spring Security context.
 * Uses SecurityContextHolder — no custom ThreadLocal.
 */
public final class SecurityContextHelper {

    private SecurityContextHelper() {}

    /**
     * Returns the current authenticated AppUser.
     * Throws AccessDeniedException if no authenticated user is present.
     */
    public static AppUser getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal p)) {
            throw new AccessDeniedException("Not authenticated");
        }
        return p.user();
    }

    /**
     * Convenience method: returns the org ID of the currently authenticated user.
     */
    public static UUID getCurrentOrgId() {
        return getCurrentUser().getOrg().getId();
    }

    /**
     * Returns the current authenticated AppUser wrapped in Optional.
     * Returns empty if no authenticated user is present (unauthenticated context).
     */
    public static Optional<AppUser> tryGetCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AppUserPrincipal p) {
            return Optional.of(p.user());
        }
        return Optional.empty();
    }
}
