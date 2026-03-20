package com.compass.platform.domain;

import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.rcdo.RallyCry;
import com.compass.platform.domain.rcdo.RallyCryRepository;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import com.compass.platform.domain.user.Org;
import com.compass.platform.domain.user.OrgRepository;
import com.compass.platform.support.AbstractRepositoryTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class OutcomeRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private OutcomeRepository outcomeRepository;

    @Autowired
    private DefiningObjectiveRepository definingObjectiveRepository;

    @Autowired
    private RallyCryRepository rallyCryRepository;

    @Autowired
    private OrgRepository orgRepository;

    @Autowired
    private AppUserRepository userRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;
    private DefiningObjective definingObjective;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Outcome Test Org").slug("outcome-test-org").build());
        em.flush();
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("RC for Outcomes").sortOrder(0).build());
        em.flush();
        definingObjective = definingObjectiveRepository.save(
                DefiningObjective.builder().org(org).rallyCry(rc).title("DO for Outcomes").sortOrder(0).build());
        em.flush();
    }

    @Test
    void shouldSaveWithDefiningObjectiveReference() {
        Outcome outcome = Outcome.builder()
                .org(org)
                .definingObjective(definingObjective)
                .title("Increase NPS")
                .description("Net promoter score above 60")
                .sortOrder(0)
                .build();

        Outcome saved = outcomeRepository.save(outcome);
        em.flush();
        em.clear();

        Optional<Outcome> found = outcomeRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Increase NPS");
        assertThat(found.get().getDescription()).isEqualTo("Net promoter score above 60");
        assertThat(found.get().isArchived()).isFalse();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindByDefiningObjectiveIdActiveOnly() {
        Outcome active1 = Outcome.builder().org(org).definingObjective(definingObjective).title("Active Outcome 1").sortOrder(0).build();
        Outcome active2 = Outcome.builder().org(org).definingObjective(definingObjective).title("Active Outcome 2").sortOrder(1).build();
        Outcome archived = Outcome.builder().org(org).definingObjective(definingObjective).title("Archived Outcome").sortOrder(2).build();

        outcomeRepository.save(active1);
        outcomeRepository.save(active2);
        Outcome savedArchived = outcomeRepository.save(archived);
        em.flush();

        savedArchived.setArchivedAt(Instant.now());
        outcomeRepository.save(savedArchived);
        em.flush();
        em.clear();

        List<Outcome> active = outcomeRepository
                .findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(definingObjective.getId());
        assertThat(active).hasSize(2);
        assertThat(active).extracting(Outcome::getTitle)
                .containsExactlyInAnyOrder("Active Outcome 1", "Active Outcome 2");
    }

    @Test
    void shouldFindByOwner() {
        AppUser owner = userRepository.save(new AppUser(org, "outcome-owner@example.com", "Outcome Owner", UserRole.EMPLOYEE, null));
        em.flush();

        Outcome owned1 = Outcome.builder().org(org).definingObjective(definingObjective).title("Owned Outcome 1").owner(owner).sortOrder(0).build();
        Outcome owned2 = Outcome.builder().org(org).definingObjective(definingObjective).title("Owned Outcome 2").owner(owner).sortOrder(1).build();
        Outcome unowned = Outcome.builder().org(org).definingObjective(definingObjective).title("Unowned Outcome").sortOrder(2).build();

        outcomeRepository.save(owned1);
        outcomeRepository.save(owned2);
        outcomeRepository.save(unowned);
        em.flush();
        em.clear();

        List<Outcome> found = outcomeRepository.findByOwnerIdAndArchivedAtIsNull(owner.getId());
        assertThat(found).hasSize(2);
        assertThat(found).extracting(Outcome::getTitle)
                .containsExactlyInAnyOrder("Owned Outcome 1", "Owned Outcome 2");
    }
}
