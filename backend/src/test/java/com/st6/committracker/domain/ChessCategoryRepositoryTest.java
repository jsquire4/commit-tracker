package com.st6.committracker.domain;

import com.st6.committracker.domain.commit.ChessCategory;
import com.st6.committracker.domain.commit.ChessCategoryRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import com.st6.committracker.support.AbstractRepositoryTest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChessCategoryRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private ChessCategoryRepository chessCategoryRepository;

    @Autowired
    private OrgRepository orgRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Chess Test Org").slug("chess-test-org").build());
        em.flush();
    }

    @Test
    void shouldSaveAndFind() {
        ChessCategory category = ChessCategory.builder()
                .org(org)
                .name("Strategic")
                .description("Long-term strategic work")
                .colorHex("#FF5733")
                .sortOrder(0)
                .isActive(true)
                .build();

        ChessCategory saved = chessCategoryRepository.save(category);
        em.flush();
        em.clear();

        Optional<ChessCategory> found = chessCategoryRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Strategic");
        assertThat(found.get().getDescription()).isEqualTo("Long-term strategic work");
        assertThat(found.get().getColorHex()).isEqualTo("#FF5733");
        assertThat(found.get().getSortOrder()).isEqualTo(0);
        assertThat(found.get().isActive()).isTrue();
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    void shouldEnforceUniqueOrgAndName() {
        ChessCategory cat1 = ChessCategory.builder().org(org).name("Tactical").sortOrder(0).build();
        ChessCategory cat2 = ChessCategory.builder().org(org).name("Tactical").sortOrder(1).build();

        chessCategoryRepository.save(cat1);
        em.flush();

        assertThatThrownBy(() -> {
            chessCategoryRepository.saveAndFlush(cat2);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowSameNameDifferentOrgs() {
        Org org2 = orgRepository.save(Org.builder().name("Another Org").slug("another-chess-org").build());
        em.flush();

        ChessCategory cat1 = ChessCategory.builder().org(org).name("Strategic").sortOrder(0).build();
        ChessCategory cat2 = ChessCategory.builder().org(org2).name("Strategic").sortOrder(0).build();

        chessCategoryRepository.save(cat1);
        chessCategoryRepository.save(cat2);
        em.flush();

        assertThat(chessCategoryRepository.findByOrgIdAndName(org.getId(), "Strategic")).isPresent();
        assertThat(chessCategoryRepository.findByOrgIdAndName(org2.getId(), "Strategic")).isPresent();
    }

    @Test
    void shouldFindActiveByOrg() {
        ChessCategory active1 = ChessCategory.builder().org(org).name("Active Cat 1").sortOrder(0).isActive(true).build();
        ChessCategory active2 = ChessCategory.builder().org(org).name("Active Cat 2").sortOrder(1).isActive(true).build();
        ChessCategory inactive = ChessCategory.builder().org(org).name("Inactive Cat").sortOrder(2).isActive(false).build();

        chessCategoryRepository.save(active1);
        chessCategoryRepository.save(active2);
        chessCategoryRepository.save(inactive);
        em.flush();
        em.clear();

        List<ChessCategory> active = chessCategoryRepository.findByOrgIdAndIsActiveTrueOrderBySortOrderAsc(org.getId());
        assertThat(active).hasSize(2);
        assertThat(active).extracting(ChessCategory::getName)
                .containsExactlyInAnyOrder("Active Cat 1", "Active Cat 2");
    }

    @Test
    void shouldFindByOrgIdAndName() {
        ChessCategory category = ChessCategory.builder()
                .org(org)
                .name("Operations")
                .sortOrder(0)
                .build();

        chessCategoryRepository.save(category);
        em.flush();
        em.clear();

        Optional<ChessCategory> found = chessCategoryRepository.findByOrgIdAndName(org.getId(), "Operations");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Operations");

        Optional<ChessCategory> notFound = chessCategoryRepository.findByOrgIdAndName(org.getId(), "NonExistent");
        assertThat(notFound).isEmpty();
    }
}
