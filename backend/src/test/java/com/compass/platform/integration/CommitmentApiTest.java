package com.compass.platform.integration;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.dto.CreateCommitmentRequest;
import com.compass.platform.domain.commit.dto.UpdateCommitmentRequest;
import com.compass.platform.domain.cycle.Cycle;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommitmentApiTest extends IntegrationTestBase {

    private Org org;
    private AppUser manager;
    private AppUser employee;
    private Cycle draftCycle;
    private Cycle lockedCycle;
    private RallyCry rallyCry;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(new Org(null, "Test Org",
                "test-org-" + UUID.randomUUID().toString().substring(0, 8), "UTC", true));

        manager = userRepository.save(new AppUser(org, "manager@example.com", "Manager User",
                UserRole.MANAGER, null));

        employee = userRepository.save(new AppUser(org, "employee@example.com", "Employee User",
                UserRole.EMPLOYEE, manager));

        Instant weekStart = Instant.now().truncatedTo(ChronoUnit.DAYS);
        draftCycle = cycleRepository.save(Cycle.builder()
                .org(org)
                .label("Test Draft Cycle")
                .state(CycleState.DRAFT)
                .startsAt(weekStart)
                .endsAt(weekStart.plus(6, ChronoUnit.DAYS))
                .isActive(true)
                .build());

        Instant lockedWeekStart = weekStart.minus(7, ChronoUnit.DAYS);
        lockedCycle = cycleRepository.save(Cycle.builder()
                .org(org)
                .label("Test Locked Cycle")
                .state(CycleState.LOCKED)
                .startsAt(lockedWeekStart)
                .endsAt(lockedWeekStart.plus(6, ChronoUnit.DAYS))
                .isActive(false)
                .build());

        rallyCry = rallyCryRepository.save(RallyCry.builder()
                .org(org)
                .title("Test Rally Cry")
                .sortOrder(0)
                .build());
    }

    @Test
    @DisplayName("POST /api/v1/commitments in DRAFT cycle returns 201")
    void createCommitment_inDraftCycle_returns201() throws Exception {
        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "My Commitment Title",
                "Description here",
                CompletionHorizon.EOW,
                null, null,
                null,
                null, null, null, null,
                null,
                List.of("Bullet one", "Bullet two"),
                null
        );

        mockMvc.perform(post("/api/v1/commitments")
                        .header("Authorization", bearerToken(employee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id", notNullValue()))
                .andExpect(jsonPath("$.data.title", is("My Commitment Title")))
                .andExpect(jsonPath("$.data.bullets", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/v1/commitments in LOCKED cycle returns 409")
    void createCommitment_inLockedCycle_returns409() throws Exception {
        CreateCommitmentRequest request = new CreateCommitmentRequest(
                lockedCycle.getId(),
                "My Commitment Title",
                "Description here",
                CompletionHorizon.EOW,
                null, null,
                null,
                null, null, null, null,
                null,
                List.of("Bullet one", "Bullet two"),
                null
        );

        mockMvc.perform(post("/api/v1/commitments")
                        .header("Authorization", bearerToken(employee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("PUT /api/v1/commitments/{id} in DRAFT cycle returns 200")
    void updateCommitment_inDraftCycle_returns200() throws Exception {
        Commitment commitment = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(draftCycle)
                .title("Original Title")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(0)
                .build());
        saveBullets(commitment, org, List.of("Bullet one", "Bullet two"));

        UpdateCommitmentRequest updateRequest = new UpdateCommitmentRequest(
                "Updated Title",
                "Updated description",
                CompletionHorizon.EOD,
                null, null,
                null,
                null, null, null, null,
                List.of("New bullet one", "New bullet two"),
                null
        );

        mockMvc.perform(put("/api/v1/commitments/" + commitment.getId())
                        .header("Authorization", bearerToken(employee))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Updated Title")));
    }

    @Test
    @DisplayName("DELETE /api/v1/commitments/{id} in DRAFT cycle returns 204")
    void deleteCommitment_inDraftCycle_returns204() throws Exception {
        Commitment commitment = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(draftCycle)
                .title("Commitment To Delete")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(0)
                .build());
        saveBullets(commitment, org, List.of("Bullet one", "Bullet two"));

        mockMvc.perform(delete("/api/v1/commitments/" + commitment.getId())
                        .header("Authorization", bearerToken(employee)))
                .andExpect(status().isNoContent());

        // Verify it's gone
        mockMvc.perform(get("/api/v1/commitments/" + commitment.getId())
                        .header("Authorization", bearerToken(employee)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/v1/commitments?rallyCryId=X returns filtered results")
    void listCommitments_filteredByRcdo_returnsFiltered() throws Exception {
        // Commitment linked to rally cry
        Commitment linked = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(draftCycle)
                .title("Linked Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .rallyCry(rallyCry)
                .priorityRank(0)
                .build());
        saveBullets(linked, org, List.of("Bullet one", "Bullet two"));

        // Commitment NOT linked to rally cry
        Commitment unlinked = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employee)
                .cycle(draftCycle)
                .title("Unlinked Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(1)
                .build());
        saveBullets(unlinked, org, List.of("Bullet one", "Bullet two"));

        mockMvc.perform(get("/api/v1/commitments")
                        .param("cycleId", draftCycle.getId().toString())
                        .param("rallyCryId", rallyCry.getId().toString())
                        .header("Authorization", bearerToken(manager)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].title", is("Linked Commitment")))
                .andExpect(jsonPath("$.data.totalElements", is(1)));
    }

    @Test
    @DisplayName("POST /api/v1/commitments without auth returns 401")
    void createCommitment_unauthenticated_returns401() throws Exception {
        CreateCommitmentRequest request = new CreateCommitmentRequest(
                draftCycle.getId(),
                "My Commitment Title",
                null,
                CompletionHorizon.EOW,
                null, null,
                null,
                null, null, null, null,
                null,
                List.of("Bullet one", "Bullet two"),
                null
        );

        mockMvc.perform(post("/api/v1/commitments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
