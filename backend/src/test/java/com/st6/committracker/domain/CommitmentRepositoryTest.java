package com.st6.committracker.domain;

import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.ChessCategoryRepository;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.commit.TaskBulletRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
import com.st6.committracker.domain.rcdo.Outcome;
import com.st6.committracker.domain.rcdo.OutcomeRepository;
import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import com.st6.committracker.support.AbstractRepositoryTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CommitmentRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private CommitmentRepository commitmentRepository;

    @Autowired
    private TaskBulletRepository taskBulletRepository;

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private OrgRepository orgRepository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RallyCryRepository rallyCryRepository;

    @Autowired
    private DefiningObjectiveRepository definingObjectiveRepository;

    @Autowired
    private OutcomeRepository outcomeRepository;

    @Autowired
    private ChessCategoryRepository chessCategoryRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;
    private AppUser user;
    private Cycle cycle;
    private Instant cycleStart;
    private Instant cycleEnd;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Commit Test Org").slug("commit-test-org").build());
        em.flush();

        user = userRepository.save(new AppUser(org, "user@example.com", "Test User", UserRole.EMPLOYEE, null));
        em.flush();

        cycleStart = Instant.parse("2025-01-06T00:00:00Z");
        cycleEnd = Instant.parse("2025-01-12T23:59:59Z");

        cycle = cycleRepository.save(Cycle.builder()
                .org(org).label("Week 1").state(CycleState.LOCKED)
                .startsAt(cycleStart).endsAt(cycleEnd).isActive(true).build());
        em.flush();
    }

    @Test
    void shouldSaveMinimalCommitment() {
        Commitment commitment = Commitment.builder()
                .org(org)
                .user(user)
                .cycle(cycle)
                .title("Ship the feature")
                .completionHorizon(CompletionHorizon.EOD)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        em.flush();
        em.clear();

        Optional<Commitment> found = commitmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Ship the feature");
        assertThat(found.get().getCompletionHorizon()).isEqualTo(CompletionHorizon.EOD);
        assertThat(found.get().getRallyCry()).isNull();
        assertThat(found.get().getDefiningObjective()).isNull();
        assertThat(found.get().getOutcome()).isNull();
        assertThat(found.get().getChessCategory()).isNull();
        assertThat(found.get().isUnplanned()).isFalse();
        assertThat(found.get().getPriorityRank()).isEqualTo(0);
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldSaveFullyLinkedCommitment() {
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("Be #1").sortOrder(0).build());
        em.flush();
        DefiningObjective doObj = definingObjectiveRepository.save(
                DefiningObjective.builder().org(org).rallyCry(rc).title("Grow Revenue").sortOrder(0).build());
        em.flush();
        Outcome outcome = outcomeRepository.save(
                Outcome.builder().org(org).definingObjective(doObj).title("Q1 Revenue $1M").sortOrder(0).build());
        em.flush();
        ChessCategory chess = chessCategoryRepository.save(
                ChessCategory.builder().org(org).name("Strategic").sortOrder(0).build());
        em.flush();
        AppUser manager = userRepository.save(new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null));
        em.flush();

        Commitment commitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Close enterprise deal")
                .description("Land ACME Corp as a customer")
                .completionHorizon(CompletionHorizon.EOW)
                .rallyCry(rc)
                .definingObjective(doObj)
                .outcome(outcome)
                .chessCategory(chess)
                .assignedBy(manager)
                .priorityRank(1)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        em.flush();
        em.clear();

        Optional<Commitment> found = commitmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Close enterprise deal");
        assertThat(found.get().getDescription()).isEqualTo("Land ACME Corp as a customer");
        assertThat(found.get().getCompletionHorizon()).isEqualTo(CompletionHorizon.EOW);
        assertThat(found.get().getPriorityRank()).isEqualTo(1);
    }

    @Test
    void shouldEnforceRcdoHierarchyConsistency_OutcomeWithoutDO() {
        // outcome set but definingObjective is null — DB constraint should reject this
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("RC Only").sortOrder(0).build());
        em.flush();
        DefiningObjective doObj = definingObjectiveRepository.save(
                DefiningObjective.builder().org(org).rallyCry(rc).title("DO For Outcome").sortOrder(0).build());
        em.flush();
        Outcome outcome = outcomeRepository.save(
                Outcome.builder().org(org).definingObjective(doObj).title("Some Outcome").sortOrder(0).build());
        em.flush();

        Commitment badCommitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Bad RCDO")
                .completionHorizon(CompletionHorizon.EOD)
                .rallyCry(rc)
                .outcome(outcome)   // outcome set but DO is null
                .build();

        assertThatThrownBy(() -> {
            commitmentRepository.save(badCommitment);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldEnforceRcdoHierarchyConsistency_DOWithoutRC() {
        // DO set but rallyCry is null — DB constraint should reject this
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("RC For DO").sortOrder(0).build());
        em.flush();
        DefiningObjective doObj = definingObjectiveRepository.save(
                DefiningObjective.builder().org(org).rallyCry(rc).title("DO Without RC Link").sortOrder(0).build());
        em.flush();

        Commitment badCommitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Bad RCDO DO Only")
                .completionHorizon(CompletionHorizon.EOD)
                .definingObjective(doObj)  // DO set but rallyCry is null
                .build();

        assertThatThrownBy(() -> {
            commitmentRepository.save(badCommitment);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowPartialRcdoLink_RCOnly() {
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("RC Only Valid").sortOrder(0).build());
        em.flush();

        Commitment commitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("RC-only commitment")
                .completionHorizon(CompletionHorizon.MORNING)
                .rallyCry(rc)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        em.flush();
        em.clear();

        Optional<Commitment> found = commitmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getDefiningObjective()).isNull();
        assertThat(found.get().getOutcome()).isNull();
    }

    @Test
    void shouldAllowPartialRcdoLink_RCAndDO() {
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("RC For RCAndDO").sortOrder(0).build());
        em.flush();
        DefiningObjective doObj = definingObjectiveRepository.save(
                DefiningObjective.builder().org(org).rallyCry(rc).title("DO For RCAndDO").sortOrder(0).build());
        em.flush();

        Commitment commitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("RC+DO commitment")
                .completionHorizon(CompletionHorizon.MIDDAY)
                .rallyCry(rc)
                .definingObjective(doObj)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        em.flush();
        em.clear();

        Optional<Commitment> found = commitmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getOutcome()).isNull();
    }

    @Test
    void shouldAllowNullRcdo() {
        Commitment commitment = Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Operational work")
                .completionHorizon(CompletionHorizon.AFTERNOON)
                .build();

        Commitment saved = commitmentRepository.save(commitment);
        em.flush();
        em.clear();

        Optional<Commitment> found = commitmentRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getRallyCry()).isNull();
        assertThat(found.get().getDefiningObjective()).isNull();
        assertThat(found.get().getOutcome()).isNull();
    }

    @Test
    void shouldFindByUserAndCycle() {
        AppUser otherUser = userRepository.save(new AppUser(org, "other@example.com", "Other User", UserRole.EMPLOYEE, null));
        em.flush();

        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("User Commit 1").completionHorizon(CompletionHorizon.EOD).priorityRank(0).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("User Commit 2").completionHorizon(CompletionHorizon.EOD).priorityRank(1).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("User Commit 3").completionHorizon(CompletionHorizon.EOD).priorityRank(2).build());
        commitmentRepository.save(Commitment.builder().org(org).user(otherUser).cycle(cycle)
                .title("Other User Commit").completionHorizon(CompletionHorizon.EOD).priorityRank(0).build());
        em.flush();
        em.clear();

        List<Commitment> found = commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(user.getId(), cycle.getId());
        assertThat(found).hasSize(3);
        assertThat(found).extracting(Commitment::getTitle)
                .containsExactlyInAnyOrder("User Commit 1", "User Commit 2", "User Commit 3");
    }

    @Test
    void shouldFindByOrgAndCycle() {
        AppUser user2 = userRepository.save(new AppUser(org, "user2@example.com", "User Two", UserRole.EMPLOYEE, null));
        em.flush();

        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Commit for User1").completionHorizon(CompletionHorizon.EOD).priorityRank(0).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user2).cycle(cycle)
                .title("Commit for User2").completionHorizon(CompletionHorizon.EOD).priorityRank(0).build());
        em.flush();
        em.clear();

        List<Commitment> found = commitmentRepository.findByOrgIdAndCycleIdOrderByPriorityRankAsc(org.getId(), cycle.getId());
        assertThat(found).hasSize(2);
    }

    @Test
    void shouldOrderByPriorityRank() {
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Rank 2").completionHorizon(CompletionHorizon.EOD).priorityRank(2).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Rank 0").completionHorizon(CompletionHorizon.EOD).priorityRank(0).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Rank 1").completionHorizon(CompletionHorizon.EOD).priorityRank(1).build());
        em.flush();
        em.clear();

        List<Commitment> ordered = commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(user.getId(), cycle.getId());
        assertThat(ordered).hasSize(3);
        assertThat(ordered).extracting(Commitment::getPriorityRank).containsExactly(0, 1, 2);
    }

    @Test
    void shouldTrackCarriedFrom() {
        Commitment original = commitmentRepository.save(Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Original Commitment").completionHorizon(CompletionHorizon.EOD).build());
        em.flush();

        Cycle nextCycle = cycleRepository.save(Cycle.builder()
                .org(org).label("Week 2").state(CycleState.LOCKED)
                .startsAt(cycleStart.plus(7, ChronoUnit.DAYS))
                .endsAt(cycleEnd.plus(7, ChronoUnit.DAYS))
                .isActive(false).build());
        em.flush();

        Commitment carried = Commitment.builder()
                .org(org).user(user).cycle(nextCycle)
                .title("Carried Commitment").completionHorizon(CompletionHorizon.EOD)
                .carriedFrom(original).build();
        Commitment savedCarried = commitmentRepository.save(carried);
        em.flush();
        em.clear();

        List<Commitment> carriedCommitments = commitmentRepository.findByCarriedFromId(original.getId());
        assertThat(carriedCommitments).hasSize(1);
        assertThat(carriedCommitments.get(0).getId()).isEqualTo(savedCarried.getId());
    }

    @Test
    void shouldCountByChessCategory() {
        ChessCategory strategic = chessCategoryRepository.save(
                ChessCategory.builder().org(org).name("Strategic").sortOrder(0).build());
        ChessCategory tactical = chessCategoryRepository.save(
                ChessCategory.builder().org(org).name("Tactical").sortOrder(1).build());
        em.flush();

        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("S1").completionHorizon(CompletionHorizon.EOD).chessCategory(strategic).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("S2").completionHorizon(CompletionHorizon.EOD).chessCategory(strategic).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("T1").completionHorizon(CompletionHorizon.EOD).chessCategory(tactical).build());
        em.flush();
        em.clear();

        long strategicCount = commitmentRepository.countByOrgIdAndCycleIdAndChessCategoryId(
                org.getId(), cycle.getId(), strategic.getId());
        long tacticalCount = commitmentRepository.countByOrgIdAndCycleIdAndChessCategoryId(
                org.getId(), cycle.getId(), tactical.getId());

        assertThat(strategicCount).isEqualTo(2L);
        assertThat(tacticalCount).isEqualTo(1L);
    }

    @Test
    void shouldFindByAssignedBy() {
        AppUser manager = userRepository.save(new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null));
        em.flush();

        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Assigned 1").completionHorizon(CompletionHorizon.EOD).assignedBy(manager).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Assigned 2").completionHorizon(CompletionHorizon.EOD).assignedBy(manager).build());
        commitmentRepository.save(Commitment.builder().org(org).user(user).cycle(cycle)
                .title("Self-directed").completionHorizon(CompletionHorizon.EOD).build());
        em.flush();
        em.clear();

        List<Commitment> assigned = commitmentRepository.findByAssignedByIdAndCycleId(manager.getId(), cycle.getId());
        assertThat(assigned).hasSize(2);
        assertThat(assigned).extracting(Commitment::getTitle)
                .containsExactlyInAnyOrder("Assigned 1", "Assigned 2");
    }

    @Test
    void shouldPersistAllCompletionHorizons() {
        CompletionHorizon[] horizons = CompletionHorizon.values();
        int rank = 0;
        for (CompletionHorizon horizon : horizons) {
            commitmentRepository.save(Commitment.builder()
                    .org(org).user(user).cycle(cycle)
                    .title("Horizon: " + horizon.name())
                    .completionHorizon(horizon)
                    .priorityRank(rank++)
                    .build());
        }
        em.flush();
        em.clear();

        List<Commitment> all = commitmentRepository.findByUserIdAndCycleIdOrderByPriorityRankAsc(user.getId(), cycle.getId());
        assertThat(all).hasSize(horizons.length);
        assertThat(all).extracting(Commitment::getCompletionHorizon)
                .containsExactlyInAnyOrder(horizons);
    }

    @Test
    void shouldCascadeDeleteTaskBullets() {
        Commitment commitment = commitmentRepository.save(Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Commitment With Bullets").completionHorizon(CompletionHorizon.EOD).build());
        em.flush();

        taskBulletRepository.save(new TaskBullet(commitment, org, "Bullet 1", 0));
        taskBulletRepository.save(new TaskBullet(commitment, org, "Bullet 2", 1));
        taskBulletRepository.save(new TaskBullet(commitment, org, "Bullet 3", 2));
        em.flush();

        long bulletsBefore = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId()).size();
        assertThat(bulletsBefore).isEqualTo(3L);

        commitmentRepository.deleteById(commitment.getId());
        em.flush();
        em.clear();

        List<TaskBullet> bulletsAfter = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId());
        assertThat(bulletsAfter).isEmpty();
    }
}
