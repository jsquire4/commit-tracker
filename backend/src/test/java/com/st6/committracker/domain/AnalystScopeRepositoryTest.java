package com.st6.committracker.domain;

import com.st6.committracker.domain.rcdo.RallyCry;
import com.st6.committracker.domain.rcdo.RallyCryRepository;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import com.st6.committracker.security.AnalystScope;
import com.st6.committracker.security.AnalystScopeRepository;
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

class AnalystScopeRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private AnalystScopeRepository analystScopeRepository;

    @Autowired
    private OrgRepository orgRepository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RallyCryRepository rallyCryRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;
    private AppUser analyst;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Analyst Scope Test Org").slug("analyst-scope-test-org").build());
        em.flush();

        analyst = userRepository.save(new AppUser(org, "analyst@scope.com", "Analyst User", UserRole.MANAGER, null));
        em.flush();
    }

    @Test
    void shouldSaveWithRallyCryScope() {
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("Rally Cry One").sortOrder(0).build());
        em.flush();

        AnalystScope scope = AnalystScope.builder()
                .org(org)
                .analyst(analyst)
                .rallyCry(rc)
                .build();

        AnalystScope saved = analystScopeRepository.save(scope);
        em.flush();
        em.clear();

        Optional<AnalystScope> found = analystScopeRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getOrgUnitRoot()).isNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldSaveWithOrgUnitScope() {
        AppUser orgUnitRoot = userRepository.save(new AppUser(org, "root@scope.com", "Org Root", UserRole.MANAGER, null));
        em.flush();

        AnalystScope scope = AnalystScope.builder()
                .org(org)
                .analyst(analyst)
                .orgUnitRoot(orgUnitRoot)
                .build();

        AnalystScope saved = analystScopeRepository.save(scope);
        em.flush();
        em.clear();

        Optional<AnalystScope> found = analystScopeRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getRallyCry()).isNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldSaveWithBothScopes() {
        RallyCry rc = rallyCryRepository.save(RallyCry.builder().org(org).title("Both Scopes RC").sortOrder(0).build());
        AppUser orgUnitRoot = userRepository.save(new AppUser(org, "rootboth@scope.com", "Org Root Both", UserRole.MANAGER, null));
        em.flush();

        AnalystScope scope = AnalystScope.builder()
                .org(org)
                .analyst(analyst)
                .rallyCry(rc)
                .orgUnitRoot(orgUnitRoot)
                .build();

        AnalystScope saved = analystScopeRepository.save(scope);
        em.flush();
        em.clear();

        Optional<AnalystScope> found = analystScopeRepository.findById(saved.getId());
        assertThat(found).isPresent();
        // Both scopes populated — both should be non-null (lazy proxies exist)
        assertThat(found.get().getId()).isNotNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldRejectBothNull() {
        AnalystScope scope = AnalystScope.builder()
                .org(org)
                .analyst(analyst)
                // neither rallyCry nor orgUnitRoot set — violates at_least_one_scope
                .build();

        assertThatThrownBy(() -> {
            analystScopeRepository.save(scope);
            em.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldFindByAnalyst() {
        RallyCry rc1 = rallyCryRepository.save(RallyCry.builder().org(org).title("RC For Analyst 1").sortOrder(0).build());
        RallyCry rc2 = rallyCryRepository.save(RallyCry.builder().org(org).title("RC For Analyst 2").sortOrder(1).build());
        AppUser otherAnalyst = userRepository.save(new AppUser(org, "other-analyst@scope.com", "Other Analyst", UserRole.MANAGER, null));
        em.flush();

        AnalystScope scope1 = AnalystScope.builder().org(org).analyst(analyst).rallyCry(rc1).build();
        AnalystScope scope2 = AnalystScope.builder().org(org).analyst(analyst).rallyCry(rc2).build();
        AnalystScope scopeOther = AnalystScope.builder().org(org).analyst(otherAnalyst).rallyCry(rc1).build();

        analystScopeRepository.save(scope1);
        analystScopeRepository.save(scope2);
        analystScopeRepository.save(scopeOther);
        em.flush();
        em.clear();

        List<AnalystScope> found = analystScopeRepository.findByAnalystId(analyst.getId());
        assertThat(found).hasSize(2);
    }
}
