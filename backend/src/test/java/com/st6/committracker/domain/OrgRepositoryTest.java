package com.st6.committracker.domain;

import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import com.st6.committracker.support.AbstractRepositoryTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private OrgRepository orgRepository;

    @PersistenceContext
    private EntityManager em;

    @Test
    void shouldSaveAndFindOrgById() {
        Org org = Org.builder()
                .name("Meridian Corp")
                .slug("meridian-corp")
                .timezone("America/Chicago")
                .isActive(true)
                .build();

        Org saved = orgRepository.save(org);
        em.flush();
        em.clear();

        Optional<Org> found = orgRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Meridian Corp");
        assertThat(found.get().getSlug()).isEqualTo("meridian-corp");
        assertThat(found.get().getTimezone()).isEqualTo("America/Chicago");
        assertThat(found.get().isActive()).isTrue();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldFindOrgBySlug() {
        Org org = Org.builder()
                .name("Meridian")
                .slug("meridian")
                .build();

        orgRepository.save(org);
        em.flush();
        em.clear();

        Optional<Org> found = orgRepository.findBySlug("meridian");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Meridian");
    }

    @Test
    void shouldRejectDuplicateSlug() {
        Org org1 = Org.builder().name("First Corp").slug("duplicate-slug").build();
        Org org2 = Org.builder().name("Second Corp").slug("duplicate-slug").build();

        orgRepository.save(org1);
        em.flush();

        assertThatThrownBy(() -> {
            orgRepository.save(org2);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldUpdateOrgName() {
        Org org = Org.builder().name("Old Name").slug("update-test").build();
        Org saved = orgRepository.save(org);
        em.flush();

        saved.setName("New Name");
        orgRepository.save(saved);
        em.flush();
        em.clear();

        Org reloaded = orgRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getName()).isEqualTo("New Name");
    }

    @Test
    void shouldDefaultTimezone() {
        Org org = Org.builder().name("Timezone Test").slug("timezone-test").build();
        orgRepository.save(org);
        em.flush();
        em.clear();

        Org found = orgRepository.findBySlug("timezone-test").orElseThrow();
        assertThat(found.getTimezone()).isEqualTo("UTC");
    }
}
