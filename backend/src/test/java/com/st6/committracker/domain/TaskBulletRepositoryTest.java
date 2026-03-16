package com.st6.committracker.domain;

import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.commit.TaskBullet;
import com.st6.committracker.domain.commit.TaskBulletRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TaskBulletRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private TaskBulletRepository taskBulletRepository;

    @Autowired
    private CommitmentRepository commitmentRepository;

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private OrgRepository orgRepository;

    @Autowired
    private AppUserRepository userRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;
    private AppUser user;
    private Cycle cycle;
    private Commitment commitment;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Bullet Test Org").slug("bullet-test-org").build());
        em.flush();

        user = userRepository.save(new AppUser(org, "bullet-user@example.com", "Bullet User", UserRole.EMPLOYEE, null));
        em.flush();

        Instant start = Instant.parse("2025-01-06T00:00:00Z");
        Instant end = Instant.parse("2025-01-12T23:59:59Z");
        cycle = cycleRepository.save(Cycle.builder()
                .org(org).label("Bullet Week").state(CycleState.LOCKED)
                .startsAt(start).endsAt(end).isActive(true).build());
        em.flush();

        commitment = commitmentRepository.save(Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Parent Commitment").completionHorizon(CompletionHorizon.EOD).build());
        em.flush();
    }

    @Test
    void shouldSaveAndFindByCommitment() {
        TaskBullet bullet = new TaskBullet(commitment, org, "Complete the design doc", 0);
        TaskBullet saved = taskBulletRepository.save(bullet);
        em.flush();
        em.clear();

        Optional<TaskBullet> found = taskBulletRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getBody()).isEqualTo("Complete the design doc");
        assertThat(found.get().getSortOrder()).isEqualTo(0);
        assertThat(found.get().isCompleted()).isFalse();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();

        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId());
        assertThat(bullets).hasSize(1);
        assertThat(bullets.get(0).getBody()).isEqualTo("Complete the design doc");
    }

    @Test
    void shouldOrderBySortOrder() {
        taskBulletRepository.save(new TaskBullet(commitment, org, "Third task", 2));
        taskBulletRepository.save(new TaskBullet(commitment, org, "First task", 0));
        taskBulletRepository.save(new TaskBullet(commitment, org, "Second task", 1));
        em.flush();
        em.clear();

        List<TaskBullet> bullets = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId());
        assertThat(bullets).hasSize(3);
        assertThat(bullets).extracting(TaskBullet::getSortOrder).containsExactly(0, 1, 2);
        assertThat(bullets).extracting(TaskBullet::getBody)
                .containsExactly("First task", "Second task", "Third task");
    }

    @Test
    void shouldCascadeDeleteWithCommitment() {
        taskBulletRepository.save(new TaskBullet(commitment, org, "Bullet A", 0));
        taskBulletRepository.save(new TaskBullet(commitment, org, "Bullet B", 1));
        em.flush();

        assertThat(taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId())).hasSize(2);

        commitmentRepository.deleteById(commitment.getId());
        em.flush();
        em.clear();

        List<TaskBullet> remaining = taskBulletRepository.findByCommitmentIdOrderBySortOrderAsc(commitment.getId());
        assertThat(remaining).isEmpty();
    }

    @Test
    void shouldNotAllowNullBody() {
        TaskBullet bullet = new TaskBullet(commitment, org, null, 0);

        assertThatThrownBy(() -> {
            taskBulletRepository.saveAndFlush(bullet);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }
}
