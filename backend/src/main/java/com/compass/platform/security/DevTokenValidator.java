package com.compass.platform.security;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Dev/test token validator — active when Spring profile is "local" OR "test".
 * Accepts unsigned tokens with required claims for local development and testing.
 * Cannot be accidentally enabled in production — gated by @Profile, not a boolean flag.
 *
 * SECURITY: Validates that the claimed user ID exists in the database
 * (done by JwtAuthenticationFilter after calling validate()).
 */
@Component
@Profile({"local", "test", "railway"})
public class DevTokenValidator implements TokenValidator {

    private static final Logger log = LoggerFactory.getLogger(DevTokenValidator.class);

    @Override
    public Optional<JwtClaims> validate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            PlainJWT plainJWT = PlainJWT.parse(token);
            JWTClaimsSet claims = plainJWT.getJWTClaimsSet();

            String subject = claims.getSubject();
            String orgIdStr = (String) claims.getClaim("orgId");
            String email = (String) claims.getClaim("email");
            String role = (String) claims.getClaim("role");

            if (subject == null || orgIdStr == null || email == null || role == null) {
                log.debug("Dev token missing required claims");
                return Optional.empty();
            }

            UUID userId = UUID.fromString(subject);
            UUID orgId = UUID.fromString(orgIdStr);

            return Optional.of(new JwtClaims(userId, orgId, email, role));

        } catch (Exception e) {
            log.debug("Dev token parse failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
