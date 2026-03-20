package com.compass.platform.domain;

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
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserRepositoryTest extends AbstractRepositoryTest {

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private OrgRepository orgRepository;

    @PersistenceContext
    private EntityManager em;

    private Org org;

    @BeforeEach
    void setUp() {
        org = orgRepository.save(Org.builder().name("Test Org").slug("test-org").build());
        em.flush();
    }

    @Test
    void shouldSaveAndFindUserById() {
        AppUser user = new AppUser(org, "alice@example.com", "Alice Smith", UserRole.EMPLOYEE, null);
        AppUser saved = userRepository.save(user);
        em.flush();
        em.clear();

        Optional<AppUser> found = userRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("alice@example.com");
        assertThat(found.get().getDisplayName()).isEqualTo("Alice Smith");
        assertThat(found.get().getRole()).isEqualTo(UserRole.EMPLOYEE);
        assertThat(found.get().isActive()).isTrue();
        assertThat(found.get().getReportsTo()).isNull();
        assertThat(found.get().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldFindByOrgIdAndEmail() {
        AppUser user = new AppUser(org, "bob@example.com", "Bob Jones", UserRole.MANAGER, null);
        userRepository.save(user);
        em.flush();
        em.clear();

        Optional<AppUser> found = userRepository.findByOrgIdAndEmail(org.getId(), "bob@example.com");
        assertThat(found).isPresent();
        assertThat(found.get().getDisplayName()).isEqualTo("Bob Jones");
    }

    @Test
    void shouldEnforceUniqueOrgEmail() {
        AppUser user1 = new AppUser(org, "dup@example.com", "User One", UserRole.EMPLOYEE, null);
        AppUser user2 = new AppUser(org, "dup@example.com", "User Two", UserRole.EMPLOYEE, null);

        userRepository.save(user1);
        em.flush();

        assertThatThrownBy(() -> {
            userRepository.saveAndFlush(user2);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void shouldAllowSameEmailDifferentOrgs() {
        Org org2 = orgRepository.save(Org.builder().name("Other Org").slug("other-org").build());
        em.flush();

        AppUser user1 = new AppUser(org, "shared@example.com", "User In Org1", UserRole.EMPLOYEE, null);
        AppUser user2 = new AppUser(org2, "shared@example.com", "User In Org2", UserRole.EMPLOYEE, null);

        userRepository.save(user1);
        userRepository.save(user2);
        em.flush();

        assertThat(userRepository.findByOrgIdAndEmail(org.getId(), "shared@example.com")).isPresent();
        assertThat(userRepository.findByOrgIdAndEmail(org2.getId(), "shared@example.com")).isPresent();
    }

    @Test
    void shouldFindActiveUsersByOrg() {
        AppUser active1 = new AppUser(org, "active1@example.com", "Active One", UserRole.EMPLOYEE, null);
        AppUser active2 = new AppUser(org, "active2@example.com", "Active Two", UserRole.EMPLOYEE, null);
        AppUser inactive = new AppUser(org, "inactive@example.com", "Inactive", UserRole.EMPLOYEE, null);
        inactive.setActive(false);

        userRepository.save(active1);
        userRepository.save(active2);
        userRepository.save(inactive);
        em.flush();
        em.clear();

        List<AppUser> activeUsers = userRepository.findByOrgIdAndIsActiveTrue(org.getId());
        assertThat(activeUsers).hasSize(2);
        assertThat(activeUsers).extracting(AppUser::getEmail)
                .containsExactlyInAnyOrder("active1@example.com", "active2@example.com");
    }

    @Test
    void shouldFindDirectReports() {
        AppUser manager = new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null);
        userRepository.save(manager);
        em.flush();

        AppUser report1 = new AppUser(org, "report1@example.com", "Report One", UserRole.EMPLOYEE, manager);
        AppUser report2 = new AppUser(org, "report2@example.com", "Report Two", UserRole.EMPLOYEE, manager);
        userRepository.save(report1);
        userRepository.save(report2);
        em.flush();
        em.clear();

        List<AppUser> directReports = userRepository.findDirectReports(org.getId(), manager.getId());
        assertThat(directReports).hasSize(2);
        assertThat(directReports).extracting(AppUser::getEmail)
                .containsExactlyInAnyOrder("report1@example.com", "report2@example.com");
    }

    @Test
    void shouldFindSubtreeUserIds() {
        // exec -> manager -> employee1, employee2
        AppUser exec = new AppUser(org, "exec@example.com", "Executive", UserRole.EXECUTIVE, null);
        userRepository.save(exec);
        em.flush();

        AppUser manager = new AppUser(org, "mgr@example.com", "Manager", UserRole.MANAGER, exec);
        userRepository.save(manager);
        em.flush();

        AppUser emp1 = new AppUser(org, "emp1@example.com", "Employee One", UserRole.EMPLOYEE, manager);
        AppUser emp2 = new AppUser(org, "emp2@example.com", "Employee Two", UserRole.EMPLOYEE, manager);
        userRepository.save(emp1);
        userRepository.save(emp2);
        em.flush();
        em.clear();

        List<UUID> subtree = userRepository.findSubtreeUserIds(exec.getId());
        assertThat(subtree).hasSize(3);
        assertThat(subtree).containsExactlyInAnyOrder(manager.getId(), emp1.getId(), emp2.getId());
    }

    @Test
    void shouldAllowNullReportsTo() {
        AppUser topLevel = new AppUser(org, "top@example.com", "Top Level", UserRole.EXECUTIVE, null);
        AppUser saved = userRepository.save(topLevel);
        em.flush();
        em.clear();

        AppUser found = userRepository.findById(saved.getId()).orElseThrow();
        assertThat(found.getReportsTo()).isNull();
    }

    @Test
    void shouldPersistAllUserRoles() {
        UserRole[] roles = UserRole.values();
        for (int i = 0; i < roles.length; i++) {
            UserRole role = roles[i];
            AppUser user = new AppUser(org, "user" + i + "@example.com", "User " + i, role, null);
            userRepository.save(user);
        }
        em.flush();
        em.clear();

        List<AppUser> all = userRepository.findByOrgIdAndIsActiveTrue(org.getId());
        assertThat(all).hasSize(roles.length);
        assertThat(all).extracting(AppUser::getRole)
                .containsExactlyInAnyOrder(roles);
    }

    @Test
    void shouldSelfReferenceReportsTo() {
        // Verify that reports_to FK pointing to the same table works
        AppUser manager = new AppUser(org, "selfref-mgr@example.com", "Manager", UserRole.MANAGER, null);
        userRepository.save(manager);
        em.flush();

        AppUser report = new AppUser(org, "selfref-emp@example.com", "Employee", UserRole.EMPLOYEE, manager);
        userRepository.save(report);
        em.flush();
        em.clear();

        AppUser found = userRepository.findById(report.getId()).orElseThrow();
        // Access reportsTo via repository to avoid lazy proxy issues
        Optional<AppUser> foundManager = userRepository.findById(manager.getId());
        assertThat(foundManager).isPresent();

        List<AppUser> reportsToManager = userRepository.findByReportsToId(manager.getId());
        assertThat(reportsToManager).hasSize(1);
        assertThat(reportsToManager.get(0).getEmail()).isEqualTo("selfref-emp@example.com");
    }
}
