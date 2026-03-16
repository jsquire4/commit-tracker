package com.st6.committracker.domain;

import com.st6.committracker.domain.cycle.Cycle;
import com.st6.committracker.domain.cycle.CycleRepository;
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

class CycleRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private OrgRepository orgRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;
    private Instant baseStart;
    private Instant baseEnd;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Cycle Test Org").slug("cycle-test-org").build());
        em.flush();
        baseStart = Instant.parse("2025-01-06T00:00:00Z");
        baseEnd = Instant.parse("2025-01-12T23:59:59Z");
    }

    @Test
    void shouldSaveAndFindCycle() {
        Cycle cycle = Cycle.builder()
                .org(org)
                .label("Week 1 2025")
                .state(CycleState.DRAFT)
                .startsAt(baseStart)
                .endsAt(baseEnd)
                .isActive(false)
                .build();

        Cycle saved = cycleRepository.save(cycle);
        em.flush();
        em.clear();

        Optional<Cycle> found = cycleRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getLabel()).isEqualTo("Week 1 2025");
        assertThat(found.get().getState()).isEqualTo(CycleState.DRAFT);
        assertThat(found.get().getStartsAt()).isEqualTo(baseStart);
        assertThat(found.get().getEndsAt()).isEqualTo(baseEnd);
        assertThat(found.get().isActive()).isFalse();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindActiveCycleByOrg() {
        Cycle inactive = Cycle.builder()
                .org(org).label("Inactive Cycle").state(CycleState.RECONCILED)
                .startsAt(baseStart).endsAt(baseEnd).isActive(false).build();
        Cycle active = Cycle.builder()
                .org(org).label("Active Cycle").state(CycleState.LOCKED)
                .startsAt(baseStart.plus(7, ChronoUnit.DAYS))
                .endsAt(baseEnd.plus(7, ChronoUnit.DAYS))
                .isActive(true).build();

        cycleRepository.save(inactive);
        cycleRepository.save(active);
        em.flush();
        em.clear();

        Optional<Cycle> found = cycleRepository.findByOrgIdAndIsActiveTrue(org.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getLabel()).isEqualTo("Active Cycle");
    }

    @Test
    void shouldEnforceAtMostOneActiveCyclePerOrg() {
        // The DB enforces this via a unique partial index on (org_id) WHERE is_active = true
        Cycle active1 = Cycle.builder()
                .org(org).label("Active 1").state(CycleState.LOCKED)
                .startsAt(baseStart).endsAt(baseEnd).isActive(true).build();
        Cycle active2 = Cycle.builder()
                .org(org).label("Active 2").state(CycleState.LOCKED)
                .startsAt(baseStart.plus(7, ChronoUnit.DAYS))
                .endsAt(baseEnd.plus(7, ChronoUnit.DAYS))
                .isActive(true).build();

        cycleRepository.save(active1);
        em.flush();

        assertThatThrownBy(() -> {
            cycleRepository.save(active2);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowActiveForDifferentOrgs() {
        Org org2 = orgRepository.save(Org.builder().name("Second Org").slug("cycle-second-org").build());
        em.flush();

        Cycle active1 = Cycle.builder()
                .org(org).label("Org1 Active").state(CycleState.LOCKED)
                .startsAt(baseStart).endsAt(baseEnd).isActive(true).build();
        Cycle active2 = Cycle.builder()
                .org(org2).label("Org2 Active").state(CycleState.LOCKED)
                .startsAt(baseStart).endsAt(baseEnd).isActive(true).build();

        cycleRepository.save(active1);
        cycleRepository.save(active2);
        em.flush();
        em.clear();

        assertThat(cycleRepository.findByOrgIdAndIsActiveTrue(org.getId())).isPresent();
        assertThat(cycleRepository.findByOrgIdAndIsActiveTrue(org2.getId())).isPresent();
    }

    @Test
    void shouldEnforceDateOrderConstraint() {
        // ends_at <= starts_at should be rejected by DB CHECK constraint
        Cycle badCycle = Cycle.builder()
                .org(org).label("Bad Dates")
                .state(CycleState.DRAFT)
                .startsAt(baseEnd)   // starts AFTER ends
                .endsAt(baseStart)   // ends BEFORE starts
                .isActive(false).build();

        assertThatThrownBy(() -> {
            cycleRepository.save(badCycle);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldEnforceUniqueOrgStartsAt() {
        Cycle c1 = Cycle.builder()
                .org(org).label("First").state(CycleState.DRAFT)
                .startsAt(baseStart).endsAt(baseEnd).isActive(false).build();
        Cycle c2 = Cycle.builder()
                .org(org).label("Second").state(CycleState.DRAFT)
                .startsAt(baseStart)  // same starts_at as c1
                .endsAt(baseEnd.plus(7, ChronoUnit.DAYS))
                .isActive(false).build();

        cycleRepository.save(c1);
        em.flush();

        assertThatThrownBy(() -> {
            cycleRepository.save(c2);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldListByOrgOrderedByStartsAtDesc() {
        Instant start1 = Instant.parse("2025-01-06T00:00:00Z");
        Instant start2 = Instant.parse("2025-01-13T00:00:00Z");
        Instant start3 = Instant.parse("2025-01-20T00:00:00Z");

        Cycle c1 = Cycle.builder().org(org).label("Week 1").state(CycleState.RECONCILED)
                .startsAt(start1).endsAt(start1.plus(6, ChronoUnit.DAYS)).isActive(false).build();
        Cycle c2 = Cycle.builder().org(org).label("Week 2").state(CycleState.RECONCILED)
                .startsAt(start2).endsAt(start2.plus(6, ChronoUnit.DAYS)).isActive(false).build();
        Cycle c3 = Cycle.builder().org(org).label("Week 3").state(CycleState.LOCKED)
                .startsAt(start3).endsAt(start3.plus(6, ChronoUnit.DAYS)).isActive(true).build();

        cycleRepository.save(c1);
        cycleRepository.save(c3);
        cycleRepository.save(c2);
        em.flush();
        em.clear();

        List<Cycle> ordered = cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId());
        assertThat(ordered).hasSize(3);
        assertThat(ordered).extracting(Cycle::getLabel)
                .containsExactly("Week 3", "Week 2", "Week 1");
    }

    @Test
    void shouldDefaultStateToDraft() {
        Cycle cycle = Cycle.builder()
                .org(org).label("Default State")
                .startsAt(baseStart).endsAt(baseEnd).build();

        Cycle saved = cycleRepository.save(cycle);
        em.flush();
        em.clear();

        Optional<Cycle> found = cycleRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getState()).isEqualTo(CycleState.DRAFT);
        assertThat(found.get().isActive()).isFalse();
    }

    @Test
    void shouldPersistAllCycleStates() {
        CycleState[] states = CycleState.values();
        Instant start = baseStart;

        for (CycleState state : states) {
            Cycle cycle = Cycle.builder()
                    .org(org)
                    .label("Cycle for " + state.name())
                    .state(state)
                    .startsAt(start)
                    .endsAt(start.plus(6, ChronoUnit.DAYS))
                    .isActive(false)
                    .build();
            cycleRepository.save(cycle);
            start = start.plus(7, ChronoUnit.DAYS);
        }
        em.flush();
        em.clear();

        List<Cycle> all = cycleRepository.findByOrgIdOrderByStartsAtDesc(org.getId());
        assertThat(all).hasSize(states.length);
        assertThat(all).extracting(Cycle::getState)
                .containsExactlyInAnyOrder(states);
    }
}
