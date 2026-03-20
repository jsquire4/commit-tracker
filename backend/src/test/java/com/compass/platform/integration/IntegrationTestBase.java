package com.compass.platform.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.compass.platform.domain.commit.ChessCategory;
import com.compass.platform.domain.commit.ChessCategoryRepository;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.commit.TaskBullet;
import com.compass.platform.domain.commit.TaskBulletRepository;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.CycleRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Testcontainers
public abstract class IntegrationTestBase {

    static PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("compass_test")
                .withUsername("compass_test")
                .withPassword("compass_test")
                .withReuse(true);
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    // Shared repositories for test data setup
    @Autowired
    protected OrgRepository orgRepository;

    @Autowired
    protected AppUserRepository userRepository;

    @Autowired
    protected CycleRepository cycleRepository;

    @Autowired
    protected CommitmentRepository commitmentRepository;

    @Autowired
    protected TaskBulletRepository taskBulletRepository;

    @Autowired
    protected RallyCryRepository rallyCryRepository;

    @Autowired
    protected ChessCategoryRepository chessCategoryRepository;

    @BeforeEach
    void cleanDatabase(@Autowired JdbcTemplate jdbc) {
        // Use TRUNCATE ... CASCADE — no need to maintain FK ordering manually.
        // This is safe because tests run against a disposable Testcontainers instance.
        jdbc.execute("TRUNCATE TABLE audit_entries, analyst_scopes, reconciliation_records, "
                + "task_bullets, commitments, cycles, outcomes, defining_objectives, "
                + "rally_cries, chess_categories, users, orgs CASCADE");
    }

    /**
     * Generate an unsigned PlainJWT token for the given user.
     * DevTokenValidator (active on "test" profile) accepts unsigned tokens with
     * required claims: sub (userId), orgId, email, role.
     */
    protected String tokenFor(AppUser user) {
        try {
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.getId().toString())
                    .claim("orgId", user.getOrg().getId().toString())
                    .claim("email", user.getEmail())
                    .claim("role", user.getRole().name())
                    .build();
            PlainJWT plainJWT = new PlainJWT(claims);
            return plainJWT.serialize();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate test token", e);
        }
    }

    /**
     * Build an Authorization header value for the given user.
     */
    protected String bearerToken(AppUser user) {
        return "Bearer " + tokenFor(user);
    }

    /**
     * Save bullets for a commitment (helper used in test setup).
     */
    protected void saveBullets(Commitment commitment, Org org, List<String> texts) {
        for (int i = 0; i < texts.size(); i++) {
            TaskBullet bullet = new TaskBullet(commitment, org, texts.get(i), i);
            taskBulletRepository.save(bullet);
        }
    }
}
