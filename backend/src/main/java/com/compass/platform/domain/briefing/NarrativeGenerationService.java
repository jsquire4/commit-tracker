package com.compass.platform.domain.briefing;

import com.compass.platform.config.LlmConfig;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.commit.CommitmentRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Lifecycle hook that generates sealed LLM narratives when a cycle transitions to RECONCILED.
 *
 * <p>Called from {@link com.compass.platform.domain.cycle.CycleService#completeCycle} after
 * carry-forward processing. Generates three narrative types:
 * <ul>
 *   <li>S1 — Executive briefing ({@link BriefingService#generateBriefing})</li>
 *   <li>S3 — Week-in-review narrative ({@link BriefingService#generateWeekNarrative})</li>
 *   <li>S4 — Team summary per manager ({@link BriefingService#generateTeamSummary})</li>
 * </ul>
 *
 * <p>Failures in any step are caught and logged; narrative generation never blocks
 * a cycle transition.
 */
@Service
public class NarrativeGenerationService {

    private static final Logger log = LoggerFactory.getLogger(NarrativeGenerationService.class);

    private static final List<UserRole> MANAGER_ROLES =
            List.of(UserRole.MANAGER, UserRole.DIRECTOR, UserRole.VP);

    private final BriefingService briefingService;
    private final AppUserRepository userRepository;
    private final CommitmentRepository commitmentRepository;
    private final LlmConfig llmConfig;

    public NarrativeGenerationService(BriefingService briefingService,
                                      AppUserRepository userRepository,
                                      CommitmentRepository commitmentRepository,
                                      LlmConfig llmConfig) {
        this.briefingService = briefingService;
        this.userRepository = userRepository;
        this.commitmentRepository = commitmentRepository;
        this.llmConfig = llmConfig;
    }

    /**
     * Generate all sealed narratives for the completed cycle.
     *
     * <p>This method is fire-and-forget — every step is wrapped in its own try/catch
     * so that an LLM failure in one narrative does not prevent others from being generated,
     * and so that the overall cycle transition is never blocked.
     *
     * @param orgId   the organization that owns the cycle
     * @param cycleId the just-reconciled cycle
     */
    public void generateNarrativesForCycle(UUID orgId, UUID cycleId) {
        if (!llmConfig.isConfigured()) {
            log.debug("LLM not configured — skipping sealed narrative generation for cycleId={}", cycleId);
            return;
        }

        log.info("Starting sealed narrative generation for org={} cycle={}", orgId, cycleId);

        // S1 — Executive briefing
        try {
            briefingService.generateBriefing(orgId, cycleId);
            log.info("S1 briefing generated for cycle={}", cycleId);
        } catch (Exception e) {
            log.error("S1 briefing generation failed for cycle={}: {}", cycleId, e.getMessage(), e);
        }

        // S3 — Week-in-review narrative
        try {
            briefingService.generateWeekNarrative(orgId, cycleId);
            log.info("S3 week narrative generated for cycle={}", cycleId);
        } catch (Exception e) {
            log.error("S3 week narrative generation failed for cycle={}: {}", cycleId, e.getMessage(), e);
        }

        // S4 — Team summary per manager (MANAGER, DIRECTOR, VP)
        List<AppUser> managers = userRepository.findByOrgIdAndRoleIn(orgId, MANAGER_ROLES);
        log.info("Generating S4 team summaries for {} managers in org={} cycle={}", managers.size(), orgId, cycleId);

        // Pre-load all org commitments once to avoid N+1 queries (one per manager)
        List<Commitment> allOrgCommitments =
                commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(orgId, cycleId);

        for (AppUser manager : managers) {
            try {
                briefingService.generateTeamSummary(orgId, cycleId, manager.getId(), allOrgCommitments);
                log.info("S4 team summary generated for manager={} cycle={}", manager.getId(), cycleId);
            } catch (Exception e) {
                log.error("S4 team summary failed for manager={} cycle={}: {}",
                        manager.getId(), cycleId, e.getMessage(), e);
            }
        }

        log.info("Sealed narrative generation complete for org={} cycle={}", orgId, cycleId);
    }
}
