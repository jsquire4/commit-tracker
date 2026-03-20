package com.compass.platform.security;

import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JWT authentication filter that runs once per request.
 * Extracts Bearer token, validates it, loads the AppUser, and sets the
 * authentication in the Spring SecurityContextHolder.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final TokenValidator tokenValidator;
    private final AppUserRepository userRepository;

    public JwtAuthenticationFilter(TokenValidator tokenValidator,
                                    AppUserRepository userRepository) {
        this.tokenValidator = tokenValidator;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = extractBearerToken(request);
            if (token != null) {
                Optional<TokenValidator.JwtClaims> claimsOpt = tokenValidator.validate(token);
                if (claimsOpt.isPresent()) {
                    TokenValidator.JwtClaims claims = claimsOpt.get();
                    // Load user with org eagerly to avoid LazyInitializationException
                    // when actor is passed to services that access actor.getOrg()
                    Optional<AppUser> userOpt = userRepository.findWithOrgById(claims.userId());
                    if (userOpt.isPresent()) {
                        AppUser user = userOpt.get();
                        UsernamePasswordAuthenticationToken auth =
                                new UsernamePasswordAuthenticationToken(
                                        new AppUserPrincipal(user),
                                        null,
                                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole())));
                        SecurityContextHolder.getContext().setAuthentication(auth);

                        // Set MDC fields for structured logging
                        MDC.put("userId", user.getId().toString());
                        MDC.put("orgId", user.getOrg().getId().toString());
                        String requestId = request.getHeader("X-Request-Id");
                        if (requestId != null) {
                            MDC.put("requestId", requestId);
                        }
                    } else {
                        log.debug("JWT references unknown userId: {}", claims.userId());
                    }
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
            MDC.clear();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.equals("/actuator/health")
                || path.equals("/actuator/info")
                || path.equals("/api/health");
    }

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
