package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
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
 * - rally_cry-scoped: only commitments explicitly linked to that RallyCry.
 *   {@code computeVisibleUserIds} returns all active org users so the user-id
 *   pre-filter passes, but {@code canViewCommitment} then enforces that the
 *   commitment's rally cry is one of the analyst's scoped rally cries and is
 *   non-null. Commitments with no RCDO link are excluded for these analysts.
 * - org_unit-scoped: entire subtree under orgUnitRoot using the recursive CTE.
 *   No additional commitment-level restriction.
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
                // rally_cry-scoped: all active users in the org who have commitments linked to that RC.
                // We include all active org users here so the user-id pre-filter passes for any user.
                // The real rally cry restriction is enforced per-commitment in canViewCommitment().
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

    /**
     * Commitment-level guard for rally-cry-scoped analysts.
     * <p>
     * If the analyst has ANY rally-cry scope, a commitment is only visible when its
     * {@code rallyCry} field is non-null and matches one of the scoped rally cries.
     * Commitments with no rally-cry link (unlinked / uncategorized) are excluded,
     * preventing data leakage for analysts who should only see a specific rally cry.
     * <p>
     * Analysts whose scopes are exclusively org_unit-based have no such restriction
     * (they see everything in their subtree regardless of RCDO linkage), so this
     * method returns {@code true} immediately when no rally-cry scopes are present.
     */
    @Override
    public boolean canViewCommitment(AppUser actor, Commitment commitment) {
        List<AnalystScope> scopes = analystScopeRepository.findByAnalystId(actor.getId());

        Set<UUID> scopedRallyCryIds = scopes.stream()
                .filter(s -> s.getRallyCry() != null)
                .map(s -> s.getRallyCry().getId())
                .collect(Collectors.toSet());

        if (scopedRallyCryIds.isEmpty()) {
            // No rally-cry scopes — restriction does not apply.
            return true;
        }

        // Commitment must be linked to one of the analyst's scoped rally cries.
        // A null rallyCry means the commitment is unlinked and must not be exposed.
        return commitment.getRallyCry() != null
                && scopedRallyCryIds.contains(commitment.getRallyCry().getId());
    }
}
