package com.st6.committracker.domain.observatory;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.integration.IntegrationTestBase;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link ObservatoryController}.
 *
 * <p>These tests verify the two most important invariants of the observatory endpoints:
 * <ol>
 *   <li>An EXECUTIVE caller receives a valid health response with the expected structure.</li>
 *   <li>An EMPLOYEE caller is rejected with 403 Forbidden (role guard enforcement).</li>
 * </ol>
 */
class ObservatoryControllerTest extends IntegrationTestBase {

    private Org org;
    private AppUser executive;
    private AppUser employee;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(new Org(null, "Observatory Test Org",
                "obs-test-" + UUID.randomUUID().toString().substring(0, 8), "UTC", true));

        executive = userRepository.save(
                new AppUser(org, "exec@example.com", "Executive User", UserRole.EXECUTIVE, null));

        employee = userRepository.save(
                new AppUser(org, "emp@example.com", "Employee User", UserRole.EMPLOYEE, null));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // /health
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/observatory/health as EXECUTIVE returns 200 with health response structure")
    void getHealth_asExecutive_returns200WithStructure() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/health")
                        .header("Authorization", bearerToken(executive)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.orgId", is(org.getId().toString())))
                .andExpect(jsonPath("$.data.orgName", is("Observatory Test Org")))
                .andExpect(jsonPath("$.data.overallGrade", notNullValue()))
                .andExpect(jsonPath("$.data.strategicAlignmentPct", notNullValue()))
                .andExpect(jsonPath("$.data.completionRate", notNullValue()))
                .andExpect(jsonPath("$.data.carryForwardRate", notNullValue()))
                .andExpect(jsonPath("$.data.activeDriftSignals", notNullValue()))
                .andExpect(jsonPath("$.data.integrityFlags", notNullValue()))
                .andExpect(jsonPath("$.data.units", notNullValue()))
                .andExpect(jsonPath("$.data.computedAt", notNullValue()));
    }

    @Test
    @DisplayName("GET /api/v1/observatory/health as EMPLOYEE returns 403")
    void getHealth_asEmployee_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/health")
                        .header("Authorization", bearerToken(employee)))
                .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role guard — verify DIRECTOR and VP also have access
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/observatory/health as DIRECTOR returns 200")
    void getHealth_asDirector_returns200() throws Exception {
        AppUser director = userRepository.save(
                new AppUser(org, "dir@example.com", "Director User", UserRole.DIRECTOR, null));

        mockMvc.perform(get("/api/v1/observatory/health")
                        .header("Authorization", bearerToken(director)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orgId", is(org.getId().toString())));
    }

    @Test
    @DisplayName("GET /api/v1/observatory/health as MANAGER returns 403")
    void getHealth_asManager_returns403() throws Exception {
        AppUser manager = userRepository.save(
                new AppUser(org, "mgr@example.com", "Manager User", UserRole.MANAGER, null));

        mockMvc.perform(get("/api/v1/observatory/health")
                        .header("Authorization", bearerToken(manager)))
                .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // /config
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/observatory/config as EXECUTIVE returns 200 with default thresholds")
    void getConfig_asExecutive_returnsDefaults() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/config")
                        .header("Authorization", bearerToken(executive)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.driftEmergingWeeks", is(3)))
                .andExpect(jsonPath("$.data.driftSustainedWeeks", is(6)))
                .andExpect(jsonPath("$.data.driftStructuralWeeks", is(12)));
    }

    @Test
    @DisplayName("GET /api/v1/observatory/config as EMPLOYEE returns 403")
    void getConfig_asEmployee_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/config")
                        .header("Authorization", bearerToken(employee)))
                .andExpect(status().isForbidden());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // /drift
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/observatory/drift as EXECUTIVE returns 200")
    void getDrift_asExecutive_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/drift")
                        .header("Authorization", bearerToken(executive)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.signals", notNullValue()));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Unauthenticated
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/v1/observatory/health without token returns 401")
    void getHealth_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/observatory/health"))
                .andExpect(status().isUnauthorized());
    }
}
