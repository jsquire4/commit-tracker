package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NarrativeGenerationServiceTest {

    @Mock private BriefingService briefingService;
    @Mock private AppUserRepository userRepository;
    @Mock private CommitmentRepository commitmentRepository;
    @Mock private LlmConfig llmConfig;

    @InjectMocks private NarrativeGenerationService service;

    private UUID orgId;
    private UUID cycleId;

    @BeforeEach
    void setUp() {
        orgId   = UUID.randomUUID();
        cycleId = UUID.randomUUID();
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private AppUser managerWithId(UUID id, UserRole role) {
        AppUser u = new AppUser(null, "m@example.com", "Manager", role, null);
        u.setId(id);
        return u;
    }

    // ── 1. LLM not configured — early return, nothing called ─────────────────

    @Test
    void whenLlmNotConfigured_thenNoServiceCallsMade() {
        when(llmConfig.isConfigured()).thenReturn(false);

        service.generateNarrativesForCycle(orgId, cycleId);

        verify(briefingService, never()).generateBriefing(any(), any());
        verify(briefingService, never()).generateWeekNarrative(any(), any());
        verify(briefingService, never()).generateTeamSummary(any(), any(), any(), any());
        verify(userRepository,  never()).findByOrgIdAndRoleIn(any(), any());
        verify(commitmentRepository, never()).findByOrgIdAndCycleIdOrderByPriorityRankAsc(any(), any());
    }

    // ── 2. All three steps succeed — all methods invoked ─────────────────────

    @Test
    void whenAllStepsSucceed_thenS1S3AndS4AreAllInvoked() {
        UUID managerId  = UUID.randomUUID();
        UUID directorId = UUID.randomUUID();

        AppUser manager  = managerWithId(managerId,  UserRole.MANAGER);
        AppUser director = managerWithId(directorId, UserRole.DIRECTOR);

        Commitment c1 = mock(Commitment.class);
        Commitment c2 = mock(Commitment.class);
        List<Commitment> commitments = List.of(c1, c2);

        when(llmConfig.isConfigured()).thenReturn(true);
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of(manager, director));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(commitments);

        service.generateNarrativesForCycle(orgId, cycleId);

        verify(briefingService).generateBriefing(orgId, cycleId);
        verify(briefingService).generateWeekNarrative(orgId, cycleId);
        verify(briefingService).generateTeamSummary(orgId, cycleId, managerId,  commitments);
        verify(briefingService).generateTeamSummary(orgId, cycleId, directorId, commitments);
    }

    // ── 3. S1 throws — S3 and S4 still execute (fault isolation) ─────────────

    @Test
    void whenS1ThrowsException_thenS3AndS4StillExecute() {
        UUID managerId = UUID.randomUUID();
        AppUser manager = managerWithId(managerId, UserRole.MANAGER);
        List<Commitment> commitments = List.of(mock(Commitment.class));

        when(llmConfig.isConfigured()).thenReturn(true);
        when(briefingService.generateBriefing(orgId, cycleId))
                .thenThrow(new RuntimeException("LLM timeout"));
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of(manager));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(commitments);

        // Must not propagate the exception
        service.generateNarrativesForCycle(orgId, cycleId);

        verify(briefingService).generateWeekNarrative(orgId, cycleId);
        verify(briefingService).generateTeamSummary(orgId, cycleId, managerId, commitments);
    }

    // ── 4. Empty managers list — S4 loop is skipped entirely ─────────────────

    @Test
    void whenNoManagersExist_thenTeamSummaryIsNeverInvoked() {
        when(llmConfig.isConfigured()).thenReturn(true);
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of());
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of());

        service.generateNarrativesForCycle(orgId, cycleId);

        verify(briefingService, never()).generateTeamSummary(any(), any(), any(), any());
    }

    // ── 5. Commitments pre-loaded exactly once (N+1 prevention) ──────────────

    @Test
    void commitmentQueryExecutedExactlyOnce_regardlessOfManagerCount() {
        List<AppUser> managers = List.of(
                managerWithId(UUID.randomUUID(), UserRole.MANAGER),
                managerWithId(UUID.randomUUID(), UserRole.DIRECTOR),
                managerWithId(UUID.randomUUID(), UserRole.VP)
        );

        when(llmConfig.isConfigured()).thenReturn(true);
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(managers);
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(List.of(mock(Commitment.class)));

        service.generateNarrativesForCycle(orgId, cycleId);

        // Repository must be hit exactly once — not once per manager
        verify(commitmentRepository, times(1))
                .findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);

        // And S4 must be called three times (once per manager)
        verify(briefingService, times(3))
                .generateTeamSummary(eq(orgId), eq(cycleId), any(UUID.class), any());
    }

    // ── 6. S3 throws — S4 still executes (per-step fault isolation) ──────────

    @Test
    void whenS3ThrowsException_thenS4StillExecutes() {
        UUID managerId = UUID.randomUUID();
        AppUser manager = managerWithId(managerId, UserRole.MANAGER);
        List<Commitment> commitments = List.of(mock(Commitment.class));

        when(llmConfig.isConfigured()).thenReturn(true);
        when(briefingService.generateWeekNarrative(orgId, cycleId))
                .thenThrow(new RuntimeException("narrative service unavailable"));
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of(manager));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(commitments);

        // Must not propagate
        service.generateNarrativesForCycle(orgId, cycleId);

        verify(briefingService).generateTeamSummary(orgId, cycleId, managerId, commitments);
    }

    // ── 7. One S4 manager throws — remaining managers still processed ─────────

    @Test
    void whenOneS4ManagerThrows_thenRemainingManagersStillProcessed() {
        UUID failingManagerId  = UUID.randomUUID();
        UUID successManagerId  = UUID.randomUUID();

        AppUser failingManager  = managerWithId(failingManagerId,  UserRole.MANAGER);
        AppUser successManager  = managerWithId(successManagerId, UserRole.DIRECTOR);
        List<Commitment> commitments = List.of(mock(Commitment.class));

        when(llmConfig.isConfigured()).thenReturn(true);
        when(userRepository.findByOrgIdAndRoleIn(eq(orgId), any()))
                .thenReturn(List.of(failingManager, successManager));
        when(commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId))
                .thenReturn(commitments);
        when(briefingService.generateTeamSummary(orgId, cycleId, failingManagerId, commitments))
                .thenThrow(new RuntimeException("team summary failed"));

        // Must not propagate
        service.generateNarrativesForCycle(orgId, cycleId);

        // Second manager must still be processed despite the first one failing
        verify(briefingService).generateTeamSummary(orgId, cycleId, successManagerId, commitments);
    }
}
