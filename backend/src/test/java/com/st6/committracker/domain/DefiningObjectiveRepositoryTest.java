package com.st6.committracker.domain;

import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
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

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class DefiningObjectiveRepositoryTest extends AbstractRepositoryTest {

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
    private RallyCry rallyCry;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("DO Test Org").slug("do-test-org").build());
        em.flush();
        rallyCry = rallyCryRepository.save(RallyCry.builder().org(org).title("Primary Rally Cry").sortOrder(0).build());
        em.flush();
    }

    @Test
    void shouldSaveWithRallyCryReference() {
        DefiningObjective doObj = DefiningObjective.builder()
                .org(org)
                .rallyCry(rallyCry)
                .title("Grow Revenue")
                .description("Expand our customer base")
                .sortOrder(0)
                .build();

        DefiningObjective saved = definingObjectiveRepository.save(doObj);
        em.flush();
        em.clear();

        Optional<DefiningObjective> found = definingObjectiveRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Grow Revenue");
        assertThat(found.get().getDescription()).isEqualTo("Expand our customer base");
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindByRallyCryIdActiveOnly() {
        DefiningObjective active1 = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Active DO 1").sortOrder(0).build();
        DefiningObjective active2 = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Active DO 2").sortOrder(1).build();
        DefiningObjective archived = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Archived DO").sortOrder(2).build();

        definingObjectiveRepository.save(active1);
        definingObjectiveRepository.save(active2);
        DefiningObjective savedArchived = definingObjectiveRepository.save(archived);
        em.flush();

        savedArchived.setArchivedAt(Instant.now());
        definingObjectiveRepository.save(savedArchived);
        em.flush();
        em.clear();

        List<DefiningObjective> active = definingObjectiveRepository
                .findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(rallyCry.getId());
        assertThat(active).hasSize(2);
        assertThat(active).extracting(DefiningObjective::getTitle)
                .containsExactlyInAnyOrder("Active DO 1", "Active DO 2");
    }

    @Test
    void shouldFindByOwner() {
        AppUser owner = userRepository.save(new AppUser(org, "owner@example.com", "Owner User", UserRole.MANAGER, null));
        em.flush();

        DefiningObjective owned1 = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Owned DO 1").owner(owner).sortOrder(0).build();
        DefiningObjective owned2 = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Owned DO 2").owner(owner).sortOrder(1).build();
        DefiningObjective unowned = DefiningObjective.builder().org(org).rallyCry(rallyCry).title("Unowned DO").sortOrder(2).build();

        definingObjectiveRepository.save(owned1);
        definingObjectiveRepository.save(owned2);
        definingObjectiveRepository.save(unowned);
        em.flush();
        em.clear();

        List<DefiningObjective> found = definingObjectiveRepository.findByOwnerIdAndArchivedAtIsNull(owner.getId());
        assertThat(found).hasSize(2);
        assertThat(found).extracting(DefiningObjective::getTitle)
                .containsExactlyInAnyOrder("Owned DO 1", "Owned DO 2");
    }

    @Test
    void shouldCascadeOrgScoping() {
        // Application-level check: DO.org must match its RallyCry.org
        // Verify that a DO saved with the same org as its RC can be retrieved via org-scoped query
        DefiningObjective doObj = DefiningObjective.builder()
                .org(org)
                .rallyCry(rallyCry)
                .title("Org-Scoped DO")
                .sortOrder(0)
                .build();

        definingObjectiveRepository.save(doObj);
        em.flush();
        em.clear();

        List<DefiningObjective> found = definingObjectiveRepository.findByOrgIdAndArchivedAtIsNull(org.getId());
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getTitle()).isEqualTo("Org-Scoped DO");
    }
}
