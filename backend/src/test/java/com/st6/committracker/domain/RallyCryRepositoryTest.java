package com.st6.committracker.domain;

import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
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

class RallyCryRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private RallyCryRepository rallyCryRepository;

    @Autowired
    private OrgRepository orgRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Test Org").slug("rc-test-org").build());
        em.flush();
    }

    @Test
    void shouldSaveAndFindRallyCry() {
        RallyCry rc = RallyCry.builder()
                .org(org)
                .title("Be the Best")
                .description("Our north star")
                .sortOrder(0)
                .build();

        RallyCry saved = rallyCryRepository.save(rc);
        em.flush();
        em.clear();

        Optional<RallyCry> found = rallyCryRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getTitle()).isEqualTo("Be the Best");
        assertThat(found.get().getDescription()).isEqualTo("Our north star");
        assertThat(found.get().getSortOrder()).isEqualTo(0);
        assertThat(found.get().isArchived()).isFalse();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindActiveByOrg() {
        RallyCry active1 = RallyCry.builder().org(org).title("Active One").sortOrder(0).build();
        RallyCry active2 = RallyCry.builder().org(org).title("Active Two").sortOrder(1).build();
        RallyCry archived = RallyCry.builder().org(org).title("Archived").sortOrder(2).build();

        rallyCryRepository.save(active1);
        rallyCryRepository.save(active2);
        RallyCry savedArchived = rallyCryRepository.save(archived);
        em.flush();

        savedArchived.setArchivedAt(Instant.now());
        rallyCryRepository.save(savedArchived);
        em.flush();
        em.clear();

        List<RallyCry> active = rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(org.getId());
        assertThat(active).hasSize(2);
        assertThat(active).extracting(RallyCry::getTitle)
                .containsExactlyInAnyOrder("Active One", "Active Two");
    }

    @Test
    void shouldOrderBySortOrder() {
        RallyCry rc1 = RallyCry.builder().org(org).title("Sort Two").sortOrder(2).build();
        RallyCry rc2 = RallyCry.builder().org(org).title("Sort Zero").sortOrder(0).build();
        RallyCry rc3 = RallyCry.builder().org(org).title("Sort One").sortOrder(1).build();

        rallyCryRepository.save(rc1);
        rallyCryRepository.save(rc2);
        rallyCryRepository.save(rc3);
        em.flush();
        em.clear();

        List<RallyCry> ordered = rallyCryRepository.findByOrgIdOrderBySortOrderAsc(org.getId());
        assertThat(ordered).hasSize(3);
        assertThat(ordered).extracting(RallyCry::getSortOrder).containsExactly(0, 1, 2);
    }

    @Test
    void shouldSoftDeleteBySettingArchivedAt() {
        RallyCry rc = RallyCry.builder().org(org).title("To Archive").sortOrder(0).build();
        RallyCry saved = rallyCryRepository.save(rc);
        em.flush();

        saved.setArchivedAt(Instant.now());
        rallyCryRepository.save(saved);
        em.flush();
        em.clear();

        List<RallyCry> active = rallyCryRepository.findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(org.getId());
        assertThat(active).isEmpty();

        Optional<RallyCry> found = rallyCryRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().isArchived()).isTrue();
        assertThat(found.get().getArchivedAt()).isNotNull();
    }
}
