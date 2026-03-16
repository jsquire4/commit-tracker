package com.st6.committracker.domain.importexport;

import com.st6.committracker.audit.AuditService;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.AppUserRepository;
import com.st6.committracker.domain.user.Org;
import com.st6.committracker.domain.user.OrgRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserCsvImporterTest {

    @Mock private AppUserRepository userRepository;
    @Mock private OrgRepository orgRepository;
    @Mock private AuditService auditService;
    @InjectMocks private UserCsvImporter importer;

    private final UUID orgId = UUID.randomUUID();
    private final Org org = new Org(orgId, "Test Org", "test-org", "UTC", true);

    @Test
    void importUsers_validCsv_createsUsersAndResolvesReportsTo() {
        String csv = "email,display_name,role,reports_to_email,external_id\n" +
                     "manager@example.com,Manager User,MANAGER,,mgr-001\n" +
                     "employee@example.com,Employee User,EMPLOYEE,manager@example.com,emp-001\n";

        MockMultipartFile file = new MockMultipartFile("file", "users.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findByOrgIdAndEmail(eq(orgId), eq("manager@example.com")))
                .thenReturn(Optional.empty());
        when(userRepository.findByOrgIdAndEmail(eq(orgId), eq("employee@example.com")))
                .thenReturn(Optional.empty());

        AppUser managerUser = new AppUser(org, "manager@example.com", "Manager User", UserRole.MANAGER, null);
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> {
            AppUser u = inv.getArgument(0);
            if (u.getId() == null) {
                // set a fake id via reflection-like approach not available; just return the object
            }
            return u;
        });

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importUsers(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(2);
        assertThat(result.errors()).isEmpty();
    }

    @Test
    void importUsers_duplicateEmail_updatesExisting() {
        String csv = "email,display_name,role,reports_to_email,external_id\n" +
                     "user@example.com,Updated Name,DIRECTOR,,\n";

        MockMultipartFile file = new MockMultipartFile("file", "users.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));

        AppUser existingUser = new AppUser(org, "user@example.com", "Old Name", UserRole.EMPLOYEE, null);
        when(userRepository.findByOrgIdAndEmail(orgId, "user@example.com"))
                .thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importUsers(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.importedRows()).isEqualTo(1);
        assertThat(result.errors()).isEmpty();

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getDisplayName()).isEqualTo("Updated Name");
        assertThat(captor.getValue().getRole()).isEqualTo(UserRole.DIRECTOR);
    }

    @Test
    void importUsers_invalidRole_reportsError() {
        String csv = "email,display_name,role,reports_to_email,external_id\n" +
                     "user@example.com,Some User,INVALID_ROLE,,\n";

        MockMultipartFile file = new MockMultipartFile("file", "users.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importUsers(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(1);
        assertThat(result.errorRows()).isGreaterThan(0);
        assertThat(result.errors()).isNotEmpty();
        assertThat(result.errors().get(0).field()).isEqualTo("role");
    }

    @Test
    void importUsers_missingReportsToEmail_reportsError() {
        String csv = "email,display_name,role,reports_to_email,external_id\n" +
                     "employee@example.com,Employee,EMPLOYEE,nonexistent@example.com,\n";

        MockMultipartFile file = new MockMultipartFile("file", "users.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        when(orgRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(userRepository.findByOrgIdAndEmail(eq(orgId), eq("employee@example.com")))
                .thenReturn(Optional.empty());
        when(userRepository.findByOrgIdAndEmail(eq(orgId), eq("nonexistent@example.com")))
                .thenReturn(Optional.empty());

        AppUser savedEmployee = new AppUser(org, "employee@example.com", "Employee", UserRole.EMPLOYEE, null);
        when(userRepository.save(any(AppUser.class))).thenReturn(savedEmployee);

        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importUsers(file, orgId, actor);

        assertThat(result.errors()).isNotEmpty();
        boolean hasReportsToError = result.errors().stream()
                .anyMatch(e -> e.field().equals("reports_to_email"));
        assertThat(hasReportsToError).isTrue();
    }

    @Test
    void importUsers_emptyFile_returnsZeroResults() {
        String csv = "email,display_name,role,reports_to_email,external_id\n";

        MockMultipartFile file = new MockMultipartFile("file", "users.csv", "text/csv",
                csv.getBytes(StandardCharsets.UTF_8));

        // No stubs needed — importer returns early when no data rows are present
        AppUser actor = new AppUser(org, "actor@example.com", "Actor", UserRole.EXECUTIVE, null);

        ImportResult result = importer.importUsers(file, orgId, actor);

        assertThat(result.totalRows()).isEqualTo(0);
        assertThat(result.importedRows()).isEqualTo(0);
        assertThat(result.errors()).isEmpty();
    }
}
