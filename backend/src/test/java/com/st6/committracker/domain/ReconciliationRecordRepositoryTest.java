package com.st6.committracker.domain;

import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.commit.CommitmentRepository;
import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
import com.st6.committracker.domain.reconciliation.ReconciliationRecord;
import com.st6.committracker.domain.reconciliation.ReconciliationRecordRepository;
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

class ReconciliationRecordRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private ReconciliationRecordRepository reconciliationRecordRepository;

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
        org = orgRepository.save(Org.builder().name("Reconciliation Test Org").slug("reconciliation-test-org").build());
        em.flush();

        user = userRepository.save(new AppUser(org, "analyst@example.com", "Analyst User", UserRole.MANAGER, null));
        em.flush();

        Instant start = Instant.parse("2025-01-06T00:00:00Z");
        Instant end = Instant.parse("2025-01-12T23:59:59Z");
        cycle = cycleRepository.save(Cycle.builder()
                .org(org).label("Week 1").state(CycleState.LOCKED)
                .startsAt(start).endsAt(end).isActive(true).build());
        em.flush();

        commitment = commitmentRepository.save(Commitment.builder()
                .org(org).user(user).cycle(cycle)
                .title("Ship feature X").completionHorizon(CompletionHorizon.EOD)
                .build());
        em.flush();
    }

    @Test
    void shouldSaveReconciliationRecord() {
        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org)
                .commitment(commitment)
                .cycle(cycle)
                .status(ReconciliationStatus.COMPLETED)
                .notes("Done on time")
                .plannedHorizon(CompletionHorizon.EOD)
                .reconciledAt(Instant.now())
                .reconciledBy(user)
                .build();

        ReconciliationRecord saved = reconciliationRecordRepository.save(record);
        em.flush();
        em.clear();

        Optional<ReconciliationRecord> found = reconciliationRecordRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(ReconciliationStatus.COMPLETED);
        assertThat(found.get().getNotes()).isEqualTo("Done on time");
        assertThat(found.get().getPlannedHorizon()).isEqualTo(CompletionHorizon.EOD);
        assertThat(found.get().getReconciledAt()).isNotNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldEnforceUniqueCommitmentAndCycle() {
        ReconciliationRecord first = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(cycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(user)
                .build();
        reconciliationRecordRepository.save(first);
        em.flush();

        ReconciliationRecord duplicate = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(cycle)
                .status(ReconciliationStatus.NOT_STARTED)
                .reconciledAt(Instant.now()).reconciledBy(user)
                .build();

        assertThatThrownBy(() -> {
            reconciliationRecordRepository.saveAndFlush(duplicate);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldFindByCommitmentAndCycle() {
        ReconciliationRecord record = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(cycle)
                .status(ReconciliationStatus.PARTIALLY_COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(user)
                .build();
        reconciliationRecordRepository.save(record);
        em.flush();
        em.clear();

        Optional<ReconciliationRecord> found = reconciliationRecordRepository
                .findByCommitmentIdAndCycleId(commitment.getId(), cycle.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getStatus()).isEqualTo(ReconciliationStatus.PARTIALLY_COMPLETED);
    }

    @Test
    void shouldFindByOrgAndCycle() {
        AppUser user2 = userRepository.save(new AppUser(org, "user2@example.com", "User Two", UserRole.EMPLOYEE, null));
        em.flush();

        Commitment commitment2 = commitmentRepository.save(Commitment.builder()
                .org(org).user(user2).cycle(cycle)
                .title("Second commitment").completionHorizon(CompletionHorizon.EOW)
                .build());
        em.flush();

        ReconciliationRecord rec1 = ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(cycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(user)
                .build();
        ReconciliationRecord rec2 = ReconciliationRecord.builder()
                .org(org).commitment(commitment2).cycle(cycle)
                .status(ReconciliationStatus.NOT_STARTED)
                .reconciledAt(Instant.now()).reconciledBy(user)
                .build();
        reconciliationRecordRepository.save(rec1);
        reconciliationRecordRepository.save(rec2);
        em.flush();
        em.clear();

        List<ReconciliationRecord> found = reconciliationRecordRepository
                .findByOrgIdAndCycleId(org.getId(), cycle.getId());
        assertThat(found).hasSize(2);
    }

    @Test
    void shouldCountByStatus() {
        AppUser user2 = userRepository.save(new AppUser(org, "user2b@example.com", "User Two B", UserRole.EMPLOYEE, null));
        AppUser user3 = userRepository.save(new AppUser(org, "user3b@example.com", "User Three B", UserRole.EMPLOYEE, null));
        em.flush();

        Commitment c2 = commitmentRepository.save(Commitment.builder()
                .org(org).user(user2).cycle(cycle).title("Commit B").completionHorizon(CompletionHorizon.EOD).build());
        Commitment c3 = commitmentRepository.save(Commitment.builder()
                .org(org).user(user3).cycle(cycle).title("Commit C").completionHorizon(CompletionHorizon.EOD).build());
        em.flush();

        reconciliationRecordRepository.save(ReconciliationRecord.builder()
                .org(org).commitment(commitment).cycle(cycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(user).build());
        reconciliationRecordRepository.save(ReconciliationRecord.builder()
                .org(org).commitment(c2).cycle(cycle)
                .status(ReconciliationStatus.COMPLETED)
                .reconciledAt(Instant.now()).reconciledBy(user).build());
        reconciliationRecordRepository.save(ReconciliationRecord.builder()
                .org(org).commitment(c3).cycle(cycle)
                .status(ReconciliationStatus.NOT_STARTED)
                .reconciledAt(Instant.now()).reconciledBy(user).build());
        em.flush();
        em.clear();

        long completedCount = reconciliationRecordRepository
                .countByOrgIdAndCycleIdAndStatus(org.getId(), cycle.getId(), ReconciliationStatus.COMPLETED);
        long notStartedCount = reconciliationRecordRepository
                .countByOrgIdAndCycleIdAndStatus(org.getId(), cycle.getId(), ReconciliationStatus.NOT_STARTED);

        assertThat(completedCount).isEqualTo(2L);
        assertThat(notStartedCount).isEqualTo(1L);
    }

    @Test
    void shouldPersistAllReconciliationStatuses() {
        ReconciliationStatus[] statuses = ReconciliationStatus.values();
        // We need one commitment per status — create extra commitments
        AppUser extraUser = userRepository.save(new AppUser(org, "extra@example.com", "Extra User", UserRole.EMPLOYEE, null));
        em.flush();

        Instant cycleStart2 = Instant.parse("2025-01-13T00:00:00Z");
        Instant cycleEnd2 = Instant.parse("2025-01-19T23:59:59Z");
        Cycle cycle2 = cycleRepository.save(Cycle.builder()
                .org(org).label("Week 2 Status").state(CycleState.LOCKED)
                .startsAt(cycleStart2).endsAt(cycleEnd2).isActive(false).build());
        em.flush();

        for (int i = 0; i < statuses.length; i++) {
            Commitment c = commitmentRepository.save(Commitment.builder()
                    .org(org).user(extraUser).cycle(cycle2)
                    .title("Commit for status " + statuses[i].name())
                    .completionHorizon(CompletionHorizon.EOD)
                    .priorityRank(i)
                    .build());
            em.flush();

            reconciliationRecordRepository.save(ReconciliationRecord.builder()
                    .org(org).commitment(c).cycle(cycle2)
                    .status(statuses[i])
                    .reconciledAt(Instant.now()).reconciledBy(user)
                    .build());
            em.flush();
        }
        em.clear();

        for (ReconciliationStatus status : statuses) {
            long count = reconciliationRecordRepository
                    .countByOrgIdAndCycleIdAndStatus(org.getId(), cycle2.getId(), status);
            assertThat(count).as("Expected 1 record with status %s", status).isEqualTo(1L);
        }
    }
}
