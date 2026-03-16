package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.shared.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamActivationServiceTest {

    @Mock private AppUserRepository userRepository;
    @InjectMocks private TeamActivationService teamActivationService;

    private Org org;
    private AppUser director;
    private AppUser manager;
    private AppUser employee;
    private AppUser targetUser;

    @BeforeEach
    void setUp() {
        org = Org.builder()
                .id(UUID.randomUUID())
                .name("Test Org")
                .slug("test-org")
                .timezone("UTC")
                .isActive(true)
                .build();

        director = new AppUser(org, "director@example.com", "Director", UserRole.DIRECTOR, null);
        director.setId(UUID.randomUUID());

        manager = new AppUser(org, "manager@example.com", "Manager", UserRole.MANAGER, null);
        manager.setId(UUID.randomUUID());

        employee = new AppUser(org, "employee@example.com", "Employee", UserRole.EMPLOYEE, null);
        employee.setId(UUID.randomUUID());

        targetUser = new AppUser(org, "target@example.com", "Target", UserRole.MANAGER, null);
        targetUser.setId(UUID.randomUUID());
    }

    // -------------------------------------------------------------------------
    // activateTeam
    // -------------------------------------------------------------------------

    @Test
    void activateTeam_setsCommitModuleEnabledTrue() {
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.findSubtreeUserIds(targetUser.getId())).thenReturn(List.of());
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        teamActivationService.activateTeam(targetUser.getId(), director);

        assertThat(targetUser.getCommitModuleEnabled()).isTrue();
        verify(userRepository).save(targetUser);
    }

    @Test
    void activateTeam_requiresDirectorOrAbove_throwsForManager() {
        assertThatThrownBy(() -> teamActivationService.activateTeam(targetUser.getId(), manager))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("DIRECTOR or above required");

        verify(userRepository, never()).findById(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void activateTeam_requiresDirectorOrAbove_throwsForEmployee() {
        assertThatThrownBy(() -> teamActivationService.activateTeam(targetUser.getId(), employee))
                .isInstanceOf(AccessDeniedException.class);
    }

    // -------------------------------------------------------------------------
    // deactivateTeam
    // -------------------------------------------------------------------------

    @Test
    void deactivateTeam_setsCommitModuleEnabledFalse() {
        targetUser.setCommitModuleEnabled(true);
        when(userRepository.findById(targetUser.getId())).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any(AppUser.class))).thenAnswer(inv -> inv.getArgument(0));

        teamActivationService.deactivateTeam(targetUser.getId(), director);

        assertThat(targetUser.getCommitModuleEnabled()).isFalse();
        verify(userRepository).save(targetUser);
    }

    // -------------------------------------------------------------------------
    // isUserActivated
    // -------------------------------------------------------------------------

    @Test
    void isUserActivated_returnsTrueWhenFlagIsTrue() {
        targetUser.setCommitModuleEnabled(true);

        boolean result = teamActivationService.isUserActivated(targetUser);

        assertThat(result).isTrue();
    }

    @Test
    void isUserActivated_returnsFalseWhenFlagIsFalse_evenIfOrgIsActive() {
        // org.isActive() is true (set in setUp), but flag overrides it
        targetUser.setCommitModuleEnabled(false);

        boolean result = teamActivationService.isUserActivated(targetUser);

        assertThat(result).isFalse();
    }

    @Test
    void isUserActivated_fallsBackToOrgIsActive_whenFlagIsNull() {
        // flag is null, so falls back to org-level setting
        targetUser.setCommitModuleEnabled(null);

        // org.isActive() = true
        boolean result = teamActivationService.isUserActivated(targetUser);

        assertThat(result).isTrue();
    }

    @Test
    void isUserActivated_fallsBackToOrgIsActive_returnsFalseWhenOrgInactive() {
        Org inactiveOrg = Org.builder()
                .id(UUID.randomUUID())
                .name("Inactive Org")
                .slug("inactive-org")
                .timezone("UTC")
                .isActive(false)
                .build();

        AppUser userInInactiveOrg = new AppUser(inactiveOrg, "u@inactive.com", "User", UserRole.EMPLOYEE, null);
        userInInactiveOrg.setId(UUID.randomUUID());
        // commitModuleEnabled is null → inherit from org

        boolean result = teamActivationService.isUserActivated(userInInactiveOrg);

        assertThat(result).isFalse();
    }
}
