package com.compass.platform.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String requestId = UUID.randomUUID().toString();
        String method = request.getMethod();
        String path = request.getRequestURI();

        MDC.put("requestId", requestId);
        MDC.put("method", method);
        MDC.put("path", path);

        // Set X-Request-Id as a response header so the client can read it
        response.setHeader("X-Request-Id", requestId);

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Extract userId and orgId from security context if authenticated
            String userId = null;
            String orgId = null;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()
                    && auth.getPrincipal() instanceof com.compass.platform.security.AppUserPrincipal principal) {
                userId = principal.user().getId().toString();
                orgId = principal.user().getOrg().getId().toString();
            }

            if (userId != null) {
                MDC.put("userId", userId);
            }
            if (orgId != null) {
                MDC.put("orgId", orgId);
            }

            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            long responseSize = 0;
            String contentLengthHeader = response.getHeader("Content-Length");
            if (contentLengthHeader != null) {
                try {
                    responseSize = Long.parseLong(contentLengthHeader);
                } catch (NumberFormatException ignored) {
                    // ignore
                }
            }

            log.info("{} {} {} {}ms userId={} orgId={} requestId={} responseSize={}",
                    method, path, status, duration, userId, orgId, requestId, responseSize);

            MDC.clear();
        }
    }
}
