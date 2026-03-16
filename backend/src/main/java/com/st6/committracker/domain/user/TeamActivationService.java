package com.st6.committracker.domain.user;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.shared.EntityNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class TeamActivationService {

    private final AppUserRepository userRepository;

    public TeamActivationService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Enable the commit module for a specific user and their subtree.
     * Requires DIRECTOR+ role on the actor.
     */
    public void activateTeam(UUID rootUserId, AppUser actor) {
        requireDirectorOrAbove(actor);

        AppUser root = userRepository.findById(rootUserId)
                .orElseThrow(() -> new EntityNotFoundException("AppUser", rootUserId));

        root.setCommitModuleEnabled(true);
        userRepository.save(root);

        List<UUID> subtreeIds = userRepository.findSubtreeUserIds(rootUserId);
        if (!subtreeIds.isEmpty()) {
            List<AppUser> subtree = userRepository.findAllById(subtreeIds);
            subtree.forEach(u -> u.setCommitModuleEnabled(true));
            userRepository.saveAll(subtree);
        }
    }

    /**
     * Disable the commit module for a specific user (does not cascade to subtree).
     * Requires DIRECTOR+ role on the actor.
     */
    public void deactivateTeam(UUID rootUserId, AppUser actor) {
        requireDirectorOrAbove(actor);

        AppUser user = userRepository.findById(rootUserId)
                .orElseThrow(() -> new EntityNotFoundException("AppUser", rootUserId));

        user.setCommitModuleEnabled(false);
        userRepository.save(user);
    }

    /**
     * Check if a user has access to the commit module.
     * Returns true if commitModuleEnabled is explicitly TRUE.
     * Falls back to org.isActive when commitModuleEnabled is NULL.
     * Returns false if commitModuleEnabled is explicitly FALSE, even if org is active.
     *
     * NOTE: Re-loads the user within the current transaction to avoid LazyInitializationException
     * when the user entity was loaded in a different session (e.g., JwtAuthenticationFilter).
     */
    @Transactional(readOnly = true)
    public boolean isUserActivated(AppUser user) {
        // Re-load user within the current session to ensure lazy associations are accessible
        AppUser freshUser = userRepository.findById(user.getId()).orElse(user);
        Boolean flag = freshUser.getCommitModuleEnabled();
        if (flag != null) {
            return flag;
        }
        return freshUser.getOrg().isActive();
    }

    /**
     * Get all users in an org that have commit_module_enabled = TRUE.
     */
    @Transactional(readOnly = true)
    public List<AppUser> getActivatedUsers(UUID orgId) {
        return userRepository.findByOrgIdAndCommitModuleEnabledTrue(orgId);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private void requireDirectorOrAbove(AppUser actor) {
        UserRole role = actor.getRole();
        if (role == UserRole.EMPLOYEE || role == UserRole.MANAGER || role == UserRole.ANALYST) {
            throw new AccessDeniedException("DIRECTOR or above required to manage team activation");
        }
    }
}
