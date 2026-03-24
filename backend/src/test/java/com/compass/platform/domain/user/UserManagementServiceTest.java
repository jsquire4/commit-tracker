package com.compass.platform.domain.user;

import com.compass.platform.audit.AuditService;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.observatory.CostBand;
import com.compass.platform.domain.observatory.CostBandRepository;
import com.compass.platform.domain.user.dto.CreateOrgRequest;
import com.compass.platform.domain.user.dto.CreateUserRequest;
import com.compass.platform.domain.user.dto.UpdateUserRequest;
import com.compass.platform.shared.ConflictException;
import com.compass.platform.shared.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {

    @Mock private AppUserRepository userRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private CostBandRepository costBandRepository;
    @Mock private AuditService auditService;
    @InjectMocks private UserManagementService service;

    private Org org;
    private Org otherOrg;

    // Actors at each role level
    private AppUser executive;
    private AppUser vp;
    private AppUser director;
    private AppUser manager;
    private AppUser employee;
    private AppUser analyst;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Acme Corp")
                .slug("acme-corp")
                .timezone("UTC")
                .isActive(true)
                .build();

        otherOrg = Org.builder()
                .id(UUID.randomUUID())
                .name("Other Corp")
                .slug("other-corp")
                .timezone("UTC")
                .isActive(true)
                .build();

        executive = userWithId(org, "exec@acme.com", "Executive User", UserRole.EXECUTIVE);
        vp        = userWithId(org, "vp@acme.com",   "VP User",        UserRole.VP);
        director  = userWithId(org, "dir@acme.com",  "Director User",  UserRole.DIRECTOR);
        manager   = userWithId(org, "mgr@acme.com",  "Manager User",   UserRole.MANAGER);
        employee  = userWithId(org, "emp@acme.com",  "Employee User",  UserRole.EMPLOYEE);
        analyst   = userWithId(org, "ana@acme.com",  "Analyst User",   UserRole.ANALYST);
    }

    // ─── createUser ───────────────────────────────────────────────────────────

    @Nested
    class CreateUser {

        @Test
        void success_createsAndPersistsUser() {
            CreateUserRequest req = new CreateUserRequest(
                    "New Employee", "new@acme.com", UserRole.EMPLOYEE,
                    null, null, null);

            when(userRepository.findByOrgIdAndEmail(org.getId(), "new@acme.com"))
                    .thenReturn(Optional.empty());

            AppUser saved = userWithId(org, "new@acme.com", "New Employee", UserRole.EMPLOYEE);
            when(userRepository.save(any(AppUser.class))).thenReturn(saved);

            AppUser result = service.createUser(req, manager);

            assertThat(result.getEmail()).isEqualTo("new@acme.com");
            verify(userRepository).save(any(AppUser.class));
            verify(auditService).log(eq(org.getId()), eq("AppUser"), any(), eq("USER_CREATED"), eq(manager), any());
        }

        @Test
        void success_withReportsToInSameOrg() {
            AppUser reportsToUser = userWithId(org, "lead@acme.com", "Team Lead", UserRole.MANAGER);
            CreateUserRequest req = new CreateUserRequest(
                    "New Employee", "new@acme.com", UserRole.EMPLOYEE,
                    reportsToUser.getId(), null, null);

            when(userRepository.findByOrgIdAndEmail(org.getId(), "new@acme.com"))
                    .thenReturn(Optional.empty());
            when(userRepository.findWithOrgById(reportsToUser.getId()))
                    .thenReturn(Optional.of(reportsToUser));

            AppUser saved = userWithId(org, "new@acme.com", "New Employee", UserRole.EMPLOYEE);
            when(userRepository.save(any(AppUser.class))).thenReturn(saved);

            AppUser result = service.createUser(req, manager);

            assertThat(result).isNotNull();
            verify(userRepository).findWithOrgById(reportsToUser.getId());
        }

        @Test
        void success_withCostBand() {
            UUID costBandId = UUID.randomUUID();
            CostBand band = CostBand.builder().org(org).name("Band A").tier(1).build();
            CreateUserRequest req = new CreateUserRequest(
                    "New Employee", "new@acme.com", UserRole.EMPLOYEE,
                    null, costBandId, new BigDecimal("35.0"));

            when(userRepository.findByOrgIdAndEmail(org.getId(), "new@acme.com"))
                    .thenReturn(Optional.empty());
            when(costBandRepository.findById(costBandId)).thenReturn(Optional.of(band));

            AppUser saved = userWithId(org, "new@acme.com", "New Employee", UserRole.EMPLOYEE);
            when(userRepository.save(any(AppUser.class))).thenReturn(saved);

            service.createUser(req, manager);

            verify(costBandRepository).findById(costBandId);
        }

        @Test
        void emailAlreadyExists_throwsConflictException() {
            CreateUserRequest req = new CreateUserRequest(
                    "Duplicate", "dup@acme.com", UserRole.EMPLOYEE,
                    null, null, null);

            AppUser existing = userWithId(org, "dup@acme.com", "Existing", UserRole.EMPLOYEE);
            when(userRepository.findByOrgIdAndEmail(org.getId(), "dup@acme.com"))
                    .thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> service.createUser(req, manager))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("dup@acme.com");

            verify(userRepository, never()).save(any());
        }

        @Test
        void reportsTo_notInSameOrg_throwsConflictException() {
            AppUser otherOrgUser = userWithId(otherOrg, "foreign@other.com", "Foreign", UserRole.MANAGER);
            CreateUserRequest req = new CreateUserRequest(
                    "New Employee", "new@acme.com", UserRole.EMPLOYEE,
                    otherOrgUser.getId(), null, null);

            when(userRepository.findByOrgIdAndEmail(org.getId(), "new@acme.com"))
                    .thenReturn(Optional.empty());
            when(userRepository.findWithOrgById(otherOrgUser.getId()))
                    .thenReturn(Optional.of(otherOrgUser));

            assertThatThrownBy(() -> service.createUser(req, manager))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("same organization");

            verify(userRepository, never()).save(any());
        }

        @Test
        void reportsTo_notFound_throwsEntityNotFoundException() {
            UUID missingId = UUID.randomUUID();
            CreateUserRequest req = new CreateUserRequest(
                    "New Employee", "new@acme.com", UserRole.EMPLOYEE,
                    missingId, null, null);

            when(userRepository.findByOrgIdAndEmail(org.getId(), "new@acme.com"))
                    .thenReturn(Optional.empty());
            when(userRepository.findWithOrgById(missingId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.createUser(req, manager))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @ParameterizedTest
        @EnumSource(value = UserRole.class, names = {"EMPLOYEE", "ANALYST"})
        void employee_and_analyst_actors_throwAccessDenied(UserRole role) {
            AppUser actor = userWithId(org, "low@acme.com", "Low Role", role);
            CreateUserRequest req = new CreateUserRequest(
                    "New", "new@acme.com", UserRole.EMPLOYEE, null, null, null);

            assertThatThrownBy(() -> service.createUser(req, actor))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("MANAGER or above");

            verify(userRepository, never()).save(any());
        }
    }

    // ─── updateUser ───────────────────────────────────────────────────────────

    @Nested
    class UpdateUser {

        @Test
        void success_vpActorUpdatesAnyOrgUser() {
            AppUser target = userWithId(org, "target@acme.com", "Old Name", UserRole.EMPLOYEE);
            UpdateUserRequest req = new UpdateUserRequest(
                    "New Name", UserRole.MANAGER, null, null, null);

            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.save(any(AppUser.class))).thenReturn(target);

            AppUser result = service.updateUser(target.getId(), req, vp);

            assertThat(result.getDisplayName()).isEqualTo("New Name");
            assertThat(result.getRole()).isEqualTo(UserRole.MANAGER);
            verify(auditService).log(eq(org.getId()), eq("AppUser"), eq(target.getId()),
                    eq("USER_UPDATED"), eq(vp), any());
        }

        @Test
        void success_managerActorUpdatesSubtreeUser() {
            AppUser target = userWithId(org, "report@acme.com", "Report", UserRole.EMPLOYEE);
            UpdateUserRequest req = new UpdateUserRequest(
                    "Updated Name", UserRole.EMPLOYEE, null, null, null);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(target.getId()));
            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.save(any(AppUser.class))).thenReturn(target);

            AppUser result = service.updateUser(target.getId(), req, manager);

            assertThat(result).isNotNull();
            verify(userRepository).save(target);
        }

        @Test
        void orgBoundaryViolation_throwsAccessDenied() {
            AppUser foreignTarget = userWithId(otherOrg, "foreign@other.com", "Foreign", UserRole.EMPLOYEE);
            UpdateUserRequest req = new UpdateUserRequest(
                    "Hacked", UserRole.EXECUTIVE, null, null, null);

            // VP has no subtree check, goes straight to org membership check
            when(userRepository.findWithOrgById(foreignTarget.getId()))
                    .thenReturn(Optional.of(foreignTarget));

            assertThatThrownBy(() -> service.updateUser(foreignTarget.getId(), req, vp))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("not in your organization");

            verify(userRepository, never()).save(any());
        }

        @Test
        void selfReportsTo_throwsConflictException() {
            AppUser target = userWithId(org, "target@acme.com", "Target", UserRole.EMPLOYEE);
            // reportsToId points to the target itself
            UpdateUserRequest req = new UpdateUserRequest(
                    "Target", UserRole.EMPLOYEE, target.getId(), null, null);

            // One stub covers both calls: the main entity load and the reportsTo resolution
            // both use the same ID. Mockito returns the same stubbed value for repeated
            // invocations of the same method+args, so a single stub is sufficient.
            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));

            assertThatThrownBy(() -> service.updateUser(target.getId(), req, vp))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("cannot report to themselves");

            verify(userRepository, never()).save(any());
        }

        @Test
        void reportsTo_crossOrg_throwsConflictException() {
            AppUser target     = userWithId(org,      "target@acme.com",   "Target",  UserRole.EMPLOYEE);
            AppUser foreignMgr = userWithId(otherOrg, "foreign@other.com", "Foreign", UserRole.MANAGER);
            UpdateUserRequest req = new UpdateUserRequest(
                    "Target", UserRole.EMPLOYEE, foreignMgr.getId(), null, null);

            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.findWithOrgById(foreignMgr.getId()))
                    .thenReturn(Optional.of(foreignMgr));

            assertThatThrownBy(() -> service.updateUser(target.getId(), req, vp))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("same organization");
        }

        @Test
        void managerOutsideSubtree_throwsAccessDenied() {
            AppUser target = userWithId(org, "notmyreport@acme.com", "Not My Report", UserRole.EMPLOYEE);
            UpdateUserRequest req = new UpdateUserRequest(
                    "Updated", UserRole.EMPLOYEE, null, null, null);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of()); // target is not in subtree

            assertThatThrownBy(() -> service.updateUser(target.getId(), req, manager))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("reporting subtree");

            verify(userRepository, never()).findWithOrgById(any());
            verify(userRepository, never()).save(any());
        }
    }

    // ─── archiveUser ──────────────────────────────────────────────────────────

    @Nested
    class ArchiveUser {

        @Test
        void success_setsActiveFalseAndAudits() {
            AppUser target = userWithId(org, "target@acme.com", "Target", UserRole.EMPLOYEE);
            target.setActive(true);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(target.getId()));
            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));

            service.archiveUser(target.getId(), manager);

            assertThat(target.isActive()).isFalse();
            verify(userRepository).save(target);
            verify(auditService).log(eq(org.getId()), eq("AppUser"), eq(target.getId()),
                    eq("USER_ARCHIVED"), eq(manager), any());
        }

        @Test
        void orgBoundaryViolation_throwsAccessDenied() {
            AppUser foreignTarget = userWithId(otherOrg, "foreign@other.com", "Foreign", UserRole.EMPLOYEE);

            when(userRepository.findWithOrgById(foreignTarget.getId()))
                    .thenReturn(Optional.of(foreignTarget));

            // VP skips subtree check, hits org boundary check
            assertThatThrownBy(() -> service.archiveUser(foreignTarget.getId(), vp))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("not in your organization");

            verify(userRepository, never()).save(any());
        }

        @Test
        void managerOutsideSubtree_throwsAccessDenied() {
            AppUser target = userWithId(org, "peer@acme.com", "Peer", UserRole.EMPLOYEE);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of()); // not in subtree

            assertThatThrownBy(() -> service.archiveUser(target.getId(), manager))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("reporting subtree");

            verify(userRepository, never()).save(any());
        }
    }

    // ─── restoreUser ──────────────────────────────────────────────────────────

    @Nested
    class RestoreUser {

        @Test
        void success_setsActiveTrueAndAudits() {
            AppUser target = userWithId(org, "archived@acme.com", "Archived", UserRole.EMPLOYEE);
            target.setActive(false);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(target.getId()));
            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));

            service.restoreUser(target.getId(), manager);

            assertThat(target.isActive()).isTrue();
            verify(userRepository).save(target);
            verify(auditService).log(eq(org.getId()), eq("AppUser"), eq(target.getId()),
                    eq("USER_RESTORED"), eq(manager), any());
        }

        @Test
        void orgBoundaryViolation_throwsAccessDenied() {
            AppUser foreignTarget = userWithId(otherOrg, "foreign@other.com", "Foreign", UserRole.EMPLOYEE);
            foreignTarget.setActive(false);

            when(userRepository.findWithOrgById(foreignTarget.getId()))
                    .thenReturn(Optional.of(foreignTarget));

            assertThatThrownBy(() -> service.restoreUser(foreignTarget.getId(), vp))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("not in your organization");

            verify(userRepository, never()).save(any());
        }
    }

    // ─── listUsers ────────────────────────────────────────────────────────────

    @Nested
    class ListUsers {

        @Test
        void vpSeesFullOrg() {
            AppUser u1 = userWithId(org, "u1@acme.com", "User1", UserRole.EMPLOYEE);
            AppUser u2 = userWithId(org, "u2@acme.com", "User2", UserRole.MANAGER);
            when(userRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                    .thenReturn(List.of(u1, u2));

            List<AppUser> result = service.listUsers(vp);

            assertThat(result).containsExactlyInAnyOrder(u1, u2);
            verify(userRepository).findByOrgIdAndIsActiveTrue(org.getId());
            verify(userRepository, never()).findSubtreeUserIds(any());
        }

        @Test
        void executiveSeesFullOrg() {
            AppUser u1 = userWithId(org, "u1@acme.com", "User1", UserRole.EMPLOYEE);
            when(userRepository.findByOrgIdAndIsActiveTrue(org.getId()))
                    .thenReturn(List.of(u1));

            List<AppUser> result = service.listUsers(executive);

            assertThat(result).containsExactly(u1);
            verify(userRepository).findByOrgIdAndIsActiveTrue(org.getId());
        }

        @Test
        void managerSeesOnlySubtree() {
            AppUser report = userWithId(org, "report@acme.com", "Report", UserRole.EMPLOYEE);
            report.setActive(true);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(report.getId()));
            when(userRepository.findAllById(List.of(report.getId())))
                    .thenReturn(List.of(report));

            List<AppUser> result = service.listUsers(manager);

            assertThat(result).containsExactly(report);
            verify(userRepository, never()).findByOrgIdAndIsActiveTrue(any());
        }

        @Test
        void managerWithEmptySubtree_returnsEmptyList() {
            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of());

            List<AppUser> result = service.listUsers(manager);

            assertThat(result).isEmpty();
            verify(userRepository, never()).findAllById(any());
        }

        @Test
        void directorSeesSubtree_notFullOrg() {
            AppUser report = userWithId(org, "report@acme.com", "Report", UserRole.EMPLOYEE);
            report.setActive(true);

            when(userRepository.findSubtreeUserIds(director.getId()))
                    .thenReturn(List.of(report.getId()));
            when(userRepository.findAllById(List.of(report.getId())))
                    .thenReturn(List.of(report));

            List<AppUser> result = service.listUsers(director);

            assertThat(result).containsExactly(report);
            verify(userRepository, never()).findByOrgIdAndIsActiveTrue(any());
        }

        @Test
        void managerSubtree_filtersOutInactiveUsers() {
            AppUser active   = userWithId(org, "active@acme.com",   "Active",   UserRole.EMPLOYEE);
            AppUser inactive = userWithId(org, "inactive@acme.com", "Inactive", UserRole.EMPLOYEE);
            active.setActive(true);
            inactive.setActive(false);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(active.getId(), inactive.getId()));
            when(userRepository.findAllById(List.of(active.getId(), inactive.getId())))
                    .thenReturn(List.of(active, inactive));

            List<AppUser> result = service.listUsers(manager);

            assertThat(result).containsExactly(active);
            assertThat(result).doesNotContain(inactive);
        }

        @ParameterizedTest
        @EnumSource(value = UserRole.class, names = {"EMPLOYEE", "ANALYST"})
        void lowRoleActors_throwAccessDenied(UserRole role) {
            AppUser actor = userWithId(org, "low@acme.com", "Low Role", role);

            assertThatThrownBy(() -> service.listUsers(actor))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("MANAGER or above");
        }
    }

    // ─── createOrg ────────────────────────────────────────────────────────────

    @Nested
    class CreateOrg {

        @Test
        void success_executiveCreatesOrg() {
            CreateOrgRequest req = new CreateOrgRequest("New Corp", "new-corp", "America/New_York");

            when(orgRepository.existsBySlug("new-corp")).thenReturn(false);

            Org saved = Org.builder()
                    .id(UUID.randomUUID())
                    .name("New Corp")
                    .slug("new-corp")
                    .timezone("America/New_York")
                    .isActive(true)
                    .build();
            when(orgRepository.save(any(Org.class))).thenReturn(saved);

            Org result = service.createOrg(req, executive);

            assertThat(result.getName()).isEqualTo("New Corp");
            assertThat(result.getSlug()).isEqualTo("new-corp");
            verify(orgRepository).save(any(Org.class));
            verify(auditService).log(eq(saved.getId()), eq("Org"), eq(saved.getId()),
                    eq("ORG_CREATED"), eq(executive), any());
        }

        @Test
        void slugDerivedFromName_whenSlugIsBlank() {
            CreateOrgRequest req = new CreateOrgRequest("My New Org", null, null);

            when(orgRepository.existsBySlug("my-new-org")).thenReturn(false);

            ArgumentCaptor<Org> orgCaptor = ArgumentCaptor.forClass(Org.class);
            Org saved = Org.builder()
                    .id(UUID.randomUUID())
                    .name("My New Org")
                    .slug("my-new-org")
                    .timezone("UTC")
                    .build();
            when(orgRepository.save(any(Org.class))).thenReturn(saved);

            service.createOrg(req, executive);

            verify(orgRepository).existsBySlug("my-new-org");
        }

        @Test
        void slugDerivedFromName_stripsSpecialChars() {
            CreateOrgRequest req = new CreateOrgRequest("Acme & Sons, Inc.", "", null);

            when(orgRepository.existsBySlug("acme-sons-inc")).thenReturn(false);

            Org saved = Org.builder()
                    .id(UUID.randomUUID())
                    .name("Acme & Sons, Inc.")
                    .slug("acme-sons-inc")
                    .timezone("UTC")
                    .build();
            when(orgRepository.save(any(Org.class))).thenReturn(saved);

            service.createOrg(req, executive);

            verify(orgRepository).existsBySlug("acme-sons-inc");
        }

        @Test
        void timezoneDefaultsToUtc_whenBlank() {
            CreateOrgRequest req = new CreateOrgRequest("Timezone Corp", "tz-corp", null);

            when(orgRepository.existsBySlug("tz-corp")).thenReturn(false);

            ArgumentCaptor<Org> orgCaptor = ArgumentCaptor.forClass(Org.class);
            Org saved = Org.builder()
                    .id(UUID.randomUUID())
                    .name("Timezone Corp")
                    .slug("tz-corp")
                    .timezone("UTC")
                    .build();
            when(orgRepository.save(orgCaptor.capture())).thenReturn(saved);

            service.createOrg(req, executive);

            assertThat(orgCaptor.getValue().getTimezone()).isEqualTo("UTC");
        }

        @Test
        void duplicateSlug_throwsConflictException() {
            CreateOrgRequest req = new CreateOrgRequest("New Corp", "acme-corp", null);

            when(orgRepository.existsBySlug("acme-corp")).thenReturn(true);

            assertThatThrownBy(() -> service.createOrg(req, executive))
                    .isInstanceOf(ConflictException.class)
                    .hasMessageContaining("acme-corp");

            verify(orgRepository, never()).save(any());
        }

        @ParameterizedTest
        @EnumSource(value = UserRole.class, names = {"MANAGER", "DIRECTOR", "VP", "EMPLOYEE", "ANALYST"})
        void nonExecutive_throwsAccessDenied(UserRole role) {
            AppUser actor = userWithId(org, "notexec@acme.com", "Not Exec", role);
            CreateOrgRequest req = new CreateOrgRequest("New Corp", "new-corp", null);

            assertThatThrownBy(() -> service.createOrg(req, actor))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("EXECUTIVE");

            verify(orgRepository, never()).save(any());
        }
    }

    // ─── requireManagerOrAbove ────────────────────────────────────────────────

    @Nested
    class RequireManagerOrAbove {

        @Test
        void employee_throwsAccessDenied() {
            CreateUserRequest req = new CreateUserRequest(
                    "X", "x@acme.com", UserRole.EMPLOYEE, null, null, null);

            assertThatThrownBy(() -> service.createUser(req, employee))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("MANAGER or above");
        }

        @Test
        void analyst_throwsAccessDenied() {
            CreateUserRequest req = new CreateUserRequest(
                    "X", "x@acme.com", UserRole.EMPLOYEE, null, null, null);

            assertThatThrownBy(() -> service.createUser(req, analyst))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("MANAGER or above");
        }

        @ParameterizedTest
        @EnumSource(value = UserRole.class, names = {"MANAGER", "DIRECTOR", "VP", "EXECUTIVE"})
        void managerAndAbove_isPermitted(UserRole role) {
            AppUser actor = userWithId(org, "actor@acme.com", "Actor", role);
            CreateUserRequest req = new CreateUserRequest(
                    "X", "x@acme.com", UserRole.EMPLOYEE, null, null, null);

            when(userRepository.findByOrgIdAndEmail(org.getId(), "x@acme.com"))
                    .thenReturn(Optional.empty());
            AppUser saved = userWithId(org, "x@acme.com", "X", UserRole.EMPLOYEE);
            when(userRepository.save(any(AppUser.class))).thenReturn(saved);

            // Should not throw
            AppUser result = service.createUser(req, actor);
            assertThat(result).isNotNull();
        }
    }

    // ─── requireSubtreeAccess ─────────────────────────────────────────────────

    @Nested
    class RequireSubtreeAccess {

        @Test
        void vp_canAccessAnyUserInOrg_noSubtreeCheck() {
            AppUser target = userWithId(org, "anyone@acme.com", "Anyone", UserRole.EMPLOYEE);

            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.save(any(AppUser.class))).thenReturn(target);

            // VP should pass without findSubtreeUserIds being called
            UpdateUserRequest req = new UpdateUserRequest("Anyone", UserRole.EMPLOYEE, null, null, null);
            service.updateUser(target.getId(), req, vp);

            verify(userRepository, never()).findSubtreeUserIds(any());
        }

        @Test
        void executive_canAccessAnyUserInOrg_noSubtreeCheck() {
            AppUser target = userWithId(org, "anyone@acme.com", "Anyone", UserRole.EMPLOYEE);

            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.save(any(AppUser.class))).thenReturn(target);

            UpdateUserRequest req = new UpdateUserRequest("Anyone", UserRole.EMPLOYEE, null, null, null);
            service.updateUser(target.getId(), req, executive);

            verify(userRepository, never()).findSubtreeUserIds(any());
        }

        @Test
        void manager_targetInSubtree_isPermitted() {
            AppUser target = userWithId(org, "report@acme.com", "Report", UserRole.EMPLOYEE);

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of(target.getId()));
            when(userRepository.findWithOrgById(target.getId()))
                    .thenReturn(Optional.of(target));
            when(userRepository.save(any(AppUser.class))).thenReturn(target);

            UpdateUserRequest req = new UpdateUserRequest("Report", UserRole.EMPLOYEE, null, null, null);
            service.updateUser(target.getId(), req, manager);

            verify(userRepository).save(target);
        }

        @Test
        void manager_targetNotInSubtree_throwsAccessDenied() {
            UUID outsideId = UUID.randomUUID();

            when(userRepository.findSubtreeUserIds(manager.getId()))
                    .thenReturn(List.of()); // empty subtree

            UpdateUserRequest req = new UpdateUserRequest("Peer", UserRole.EMPLOYEE, null, null, null);

            assertThatThrownBy(() -> service.updateUser(outsideId, req, manager))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("reporting subtree");

            verify(userRepository, never()).findWithOrgById(any());
        }

        @Test
        void director_targetNotInSubtree_throwsAccessDenied() {
            UUID outsideId = UUID.randomUUID();

            when(userRepository.findSubtreeUserIds(director.getId()))
                    .thenReturn(List.of()); // empty — outside peer

            UpdateUserRequest req = new UpdateUserRequest("Peer", UserRole.EMPLOYEE, null, null, null);

            assertThatThrownBy(() -> service.updateUser(outsideId, req, director))
                    .isInstanceOf(AccessDeniedException.class)
                    .hasMessageContaining("reporting subtree");
        }
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private static AppUser userWithId(Org org, String email, String displayName, UserRole role) {
        AppUser user = new AppUser(org, email, displayName, role, null);
        user.setId(UUID.randomUUID());
        return user;
    }
}
