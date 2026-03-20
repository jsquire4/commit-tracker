package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;
import com.compass.platform.domain.user.AppUserRepository;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Visibility strategy for ANALYST role.
 * Analysts see users within their configured analyst_scopes:
 * - rally_cry-scoped: all users who have commitments linked to that RallyCry
 *   (resolved as all users in the org subtree rooted at the scope's orgUnitRoot,
 *    or if no orgUnitRoot, all active org users linked to the rally cry)
 * - org_unit-scoped: entire subtree under orgUnitRoot using the recursive CTE
 * Results from all scopes are unioned.
 */
@Component
public class AnalystVisibility implements VisibilityStrategy {

    private final AnalystScopeRepository analystScopeRepository;
    private final AppUserRepository userRepository;

    public AnalystVisibility(AnalystScopeRepository analystScopeRepository,
                              AppUserRepository userRepository) {
        this.analystScopeRepository = analystScopeRepository;
        this.userRepository = userRepository;
    }

    @Override
    public Set<UserRole> supportedRoles() {
        return Set.of(UserRole.ANALYST);
    }

    @Override
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        List<AnalystScope> scopes = analystScopeRepository.findByAnalystId(actor.getId());
        Set<UUID> ids = new HashSet<>();

        for (AnalystScope scope : scopes) {
            if (scope.getOrgUnitRoot() != null) {
                // org_unit-scoped: subtree CTE from orgUnitRoot
                ids.add(scope.getOrgUnitRoot().getId());
                ids.addAll(userRepository.findSubtreeUserIds(scope.getOrgUnitRoot().getId()));
            } else if (scope.getRallyCry() != null) {
                // rally_cry-scoped: all active users in the org who have commitments linked to that RC
                // We resolve this as all active org users — the filtering by rally cry happens
                // at the commitment level (canViewCommitment / filterVisible).
                // For computeVisibleUserIds, we include all active org users so the analyst
                // can see any commitment linked to their scoped rally cries.
                ids.addAll(
                    userRepository.findByOrgIdAndIsActiveTrue(actor.getOrg().getId())
                        .stream()
                        .map(AppUser::getId)
                        .collect(Collectors.toSet())
                );
            }
        }

        return ids;
    }
}
