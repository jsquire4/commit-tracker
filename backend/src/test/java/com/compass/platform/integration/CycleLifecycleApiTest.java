package com.compass.platform.integration;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.cycle.dto.TransitionRequest;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CycleLifecycleApiTest extends IntegrationTestBase {

    private Org org;
    private AppUser manager;
    private AppUser employee;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(new Org(null, "Cycle Test Org",
                "cycle-test-" + UUID.randomUUID().toString().substring(0, 8), "UTC", true));

        manager = userRepository.save(new AppUser(org, "cycle-manager@example.com",
                "Cycle Manager", UserRole.MANAGER, null));

        employee = userRepository.save(new AppUser(org, "cycle-employee@example.com",
                "Cycle Employee", UserRole.EMPLOYEE, manager));
    }

    @Test
    @DisplayName("GET /api/v1/cycles/current creates DRAFT if none exists")
    void getCurrentCycle_createsDraftIfNoneExists() throws Exception {
        // No cycle exists yet for this org
        mockMvc.perform(get("/api/v1/cycles/current")
                        .header("Authorization", bearerToken(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.state", is("DRAFT")))
                .andExpect(jsonPath("$.data.startsAt", notNullValue()))
                .andExpect(jsonPath("$.data.endsAt", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/cycles/{id}/transition to LOCKED succeeds with commitments")
    void transitionToLocked_succeeds() throws Exception {
        Instant weekStart = Instant.now().truncatedTo(ChronoUnit.DAYS);
        Cycle draftCycle = cycleRepository.save(Cycle.builder()
                .org(org)
                .label("Draft Cycle")
                .state(CycleState.DRAFT)
                .startsAt(weekStart)
                .endsAt(weekStart.plus(6, ChronoUnit.DAYS))
                .isActive(true)
                .build());

        Commitment commitment = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(draftCycle)
                .title("Test Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(0)
                .build());
        saveBullets(commitment, org, java.util.List.of("Bullet one", "Bullet two"));

        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, "Ready to lock");

        mockMvc.perform(post("/api/v1/cycles/" + draftCycle.getId() + "/transition")
                        .header("Authorization", bearerToken(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.state", is("LOCKED")));
    }

    @Test
    @DisplayName("POST /api/v1/cycles/{id}/transition to LOCKED with no commitments returns 409")
    void transitionToLocked_withNoCommitments_returns409() throws Exception {
        Instant weekStart = Instant.now().truncatedTo(ChronoUnit.DAYS);
        Cycle emptyCycle = cycleRepository.save(Cycle.builder()
                .org(org)
                .label("Empty Draft Cycle")
                .state(CycleState.DRAFT)
                .startsAt(weekStart)
                .endsAt(weekStart.plus(6, ChronoUnit.DAYS))
                .isActive(true)
                .build());

        TransitionRequest request = new TransitionRequest(CycleState.LOCKED, null);

        mockMvc.perform(post("/api/v1/cycles/" + emptyCycle.getId() + "/transition")
                        .header("Authorization", bearerToken(manager))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }
}
