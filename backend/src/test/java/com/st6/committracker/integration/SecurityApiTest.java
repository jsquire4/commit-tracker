package com.st6.committracker.integration;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityApiTest extends IntegrationTestBase {

    private Org org;
    private AppUser managerA;
    private AppUser employeeA1;
    private AppUser employeeA2;
    private Cycle draftCycle;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(new Org(null, "Security Test Org",
                "sec-test-" + UUID.randomUUID().toString().substring(0, 8), "UTC", true));

        managerA = userRepository.save(new AppUser(org, "manager-a@example.com",
                "Manager A", UserRole.MANAGER, null));

        employeeA1 = userRepository.save(new AppUser(org, "employee-a1@example.com",
                "Employee A1", UserRole.EMPLOYEE, managerA));

        employeeA2 = userRepository.save(new AppUser(org, "employee-a2@example.com",
                "Employee A2", UserRole.EMPLOYEE, managerA));

        Instant weekStart = Instant.now().truncatedTo(ChronoUnit.DAYS);
        draftCycle = cycleRepository.save(Cycle.builder()
                .org(org)
                .label("Security Test Cycle")
                .state(CycleState.DRAFT)
                .startsAt(weekStart)
                .endsAt(weekStart.plus(6, ChronoUnit.DAYS))
                .isActive(true)
                .build());
    }

    @Test
    @DisplayName("No token returns 401")
    void noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/cycles/current"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Employee cannot see other employee's commitments")
    void employee_cannotSeeOtherEmployeeCommitments() throws Exception {
        // Create commitment for employeeA1
        Commitment a1Commitment = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employeeA1)
                .cycle(draftCycle)
                .title("Employee A1's Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(0)
                .build());
        saveBullets(a1Commitment, org, List.of("Bullet one", "Bullet two"));

        // EmployeeA2 tries to list with userId=A1 - visibility enforcement should return 0 results
        // because A2 can only see their own commitments (they are not A1's manager)
        mockMvc.perform(get("/api/v1/commitments")
                        .param("cycleId", draftCycle.getId().toString())
                        .param("userId", employeeA1.getId().toString())
                        .header("Authorization", bearerToken(employeeA2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(0)));
    }

    @Test
    @DisplayName("Manager can see direct report's commitments")
    void manager_canSeeDirectReportCommitments() throws Exception {
        // Create commitment for employeeA1 (direct report of managerA)
        Commitment a1Commitment = commitmentRepository.save(Commitment.builder()
                .org(org)
                .user(employeeA1)
                .cycle(draftCycle)
                .title("Employee A1's Commitment")
                .completionHorizon(CompletionHorizon.EOW)
                .priorityRank(0)
                .build());
        saveBullets(a1Commitment, org, List.of("Bullet one", "Bullet two"));

        // Manager lists commitments for the cycle with userId=A1 - should see A1's commitment
        mockMvc.perform(get("/api/v1/commitments")
                        .param("cycleId", draftCycle.getId().toString())
                        .param("userId", employeeA1.getId().toString())
                        .header("Authorization", bearerToken(managerA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements", is(1)))
                .andExpect(jsonPath("$.data.items[0].title", is("Employee A1's Commitment")));
    }
}
