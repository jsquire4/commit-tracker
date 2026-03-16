package com.st6.committracker.security;

import java.util.Optional;
import java.util.UUID;

/**
 * Interface for JWT token validation.
 * Two profile-gated implementations exist:
 * - Rs256TokenValidator: production (all profiles except "local" and "test")
 * - DevTokenValidator: development/test (profiles "local" and "test")
 */
public interface TokenValidator {

    /**
     * Validates the given token string and returns claims if valid.
     * Returns empty if the token is missing, malformed, expired, or invalid.
     */
    Optional<JwtClaims> validate(String token);

    /**
     * Parsed claims extracted from a validated JWT.
     */
    record JwtClaims(UUID userId, UUID orgId, String email, String role) {}
}
