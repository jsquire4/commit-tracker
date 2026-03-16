package com.st6.committracker.security;

import com.st6.committracker.domain.user.AppUser;

import java.security.Principal;

/**
 * Wraps AppUser as a Spring Security principal.
 * Stored in SecurityContextHolder by JwtAuthenticationFilter.
 * Retrieved in services via SecurityContextHelper.getCurrentUser().
 */
public record AppUserPrincipal(AppUser user) implements Principal {

    @Override
    public String getName() {
        return user.getEmail();
    }
}
