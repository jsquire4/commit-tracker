package com.st6.committracker.config;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.shared.ApiResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dev-only endpoints for local development login.
 * Active only when Spring profile is "local" OR "test".
 * Never reachable in production — gated by @Profile.
 */
@RestController
@RequestMapping("/api/dev")
@Profile({"local", "test", "railway"})
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class DevController {

    private final AppUserRepository userRepository;

    public DevController(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * GET /api/dev/users
     * Returns all users across all orgs — used by the dev login picker.
     */
    @GetMapping("/users")
    public ApiResponse<List<DevUserDto>> listUsers() {
        List<AppUser> users = userRepository.findAll();
        List<DevUserDto> dtos = users.stream()
                .map(u -> new DevUserDto(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.getRole().name(),
                        u.getOrg().getId(),
                        u.getOrg().getName()
                ))
                .toList();
        return ApiResponse.of(dtos);
    }

    /**
     * GET /api/dev/token/{userId}
     * Generates an unsigned PlainJWT for the given user.
     * The token is accepted by DevTokenValidator in local/test profiles.
     */
    @GetMapping("/token/{userId}")
    public ResponseEntity<ApiResponse<Map<String, String>>> generateToken(@PathVariable UUID userId) {
        return userRepository.findWithOrgById(userId)
                .map(user -> {
                    JWTClaimsSet claims = new JWTClaimsSet.Builder()
                            .subject(user.getId().toString())
                            .claim("orgId", user.getOrg().getId().toString())
                            .claim("email", user.getEmail())
                            .claim("role", user.getRole().name())
                            .build();
                    String token = new PlainJWT(claims).serialize();
                    return ResponseEntity.ok(ApiResponse.of(Map.of("token", token)));
                })
                .orElse(ResponseEntity.notFound().<ApiResponse<Map<String, String>>>build());
    }

    public record DevUserDto(
            UUID id,
            String email,
            String displayName,
            String role,
            UUID orgId,
            String orgName
    ) {}
}
