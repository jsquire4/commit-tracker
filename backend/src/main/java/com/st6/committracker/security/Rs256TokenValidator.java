package com.st6.committracker.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Production token validator — active for all profiles EXCEPT "local" and "test".
 * Validates JWT signature using RS256 (asymmetric) with the configured public key.
 */
@Component
@Profile("!local & !test & !railway")
public class Rs256TokenValidator implements TokenValidator {

    private static final Logger log = LoggerFactory.getLogger(Rs256TokenValidator.class);

    @Value("${st6.jwt.public-key:}")
    private String jwtPublicKey;

    @Value("${st6.jwt.issuer:}")
    private String jwtIssuer;

    @Override
    public Optional<JwtClaims> validate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            // Parse PEM-encoded public key (strip header/footer/whitespace)
            String stripped = jwtPublicKey
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(stripped);
            RSAPublicKey publicKey = (RSAPublicKey) KeyFactory.getInstance("RSA")
                    .generatePublic(new X509EncodedKeySpec(decoded));

            RSAKey rsaKey = new RSAKey.Builder(publicKey).build();
            JWKSet jwkSet = new JWKSet(rsaKey);
            ImmutableJWKSet<SecurityContext> jwkSource = new ImmutableJWKSet<>(jwkSet);

            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwkSource));

            JWTClaimsSet claims = processor.process(token, null);

            // Validate issuer if configured
            if (jwtIssuer != null && !jwtIssuer.isBlank()) {
                if (!jwtIssuer.equals(claims.getIssuer())) {
                    log.warn("JWT issuer mismatch: expected={}, actual={}", jwtIssuer, claims.getIssuer());
                    return Optional.empty();
                }
            }

            UUID userId = UUID.fromString(claims.getSubject());
            UUID orgId = UUID.fromString((String) claims.getClaim("orgId"));
            String email = (String) claims.getClaim("email");
            String role = (String) claims.getClaim("role");

            return Optional.of(new JwtClaims(userId, orgId, email, role));

        } catch (Exception e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
