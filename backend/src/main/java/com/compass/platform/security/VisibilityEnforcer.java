package com.compass.platform.security;

import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.commit.Commitment;
import com.compass.platform.domain.rcdo.DefiningObjective;
import com.compass.platform.domain.rcdo.DefiningObjectiveRepository;
import com.compass.platform.domain.rcdo.Outcome;
import com.compass.platform.domain.rcdo.OutcomeRepository;
import com.compass.platform.domain.user.AppUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Coordinator for visibility enforcement.
 * Delegates per-role logic to injected VisibilityStrategy implementations.
 * Handles the cross-cutting RCDO owner visibility independently of role strategies.
 */
@Component
public class VisibilityEnforcer {

    private static final Logger log = LoggerFactory.getLogger(VisibilityEnforcer.class);

    private final Map<UserRole, VisibilityStrategy> strategies;
    private final DefiningObjectiveRepository definingObjectiveRepository;
    private final OutcomeRepository outcomeRepository;

    public VisibilityEnforcer(List<VisibilityStrategy> strategyList,
                               DefiningObjectiveRepository definingObjectiveRepository,
                               OutcomeRepository outcomeRepository) {
        this.strategies = new EnumMap<>(UserRole.class);
        for (VisibilityStrategy s : strategyList) {
            for (UserRole role : s.supportedRoles()) {
                strategies.put(role, s);
            }
        }
        this.definingObjectiveRepository = definingObjectiveRepository;
        this.outcomeRepository = outcomeRepository;
    }

    /**
     * Can actor view a specific commitment?
     * Checks role-based visibility first (user-id scope AND commitment-level predicate),
     * then falls back to RCDO owner cross-cutting rule.
     */
    public boolean canViewCommitment(AppUser actor, Commitment commitment) {
        if (isVisibleByStrategy(actor, commitment)) return true;
        if (isRcdoOwner(actor, commitment)) return true;
        log.warn("visibility_denied action=canViewCommitment userId={} targetCommitmentId={} targetOwnerId={} reason=outside_role_scope_and_not_rcdo_owner",
                actor.getId(), commitment.getId(), commitment.getUser().getId());
        return false;
    }

    /**
     * Batch filter: pre-compute visible user IDs once, then filter the list.
     * More efficient than calling canViewCommitment() per item.
     */
    public List<Commitment> filterVisible(AppUser actor, List<Commitment> commitments) {
        Set<UUID> visibleUserIds = computeVisibleUserIds(actor);
        Set<UUID> ownedRcdoIds = computeOwnedRcdoIds(actor);
        VisibilityStrategy strategy = strategies.get(actor.getRole());
        List<Commitment> visible = commitments.stream()
                .filter(c -> (visibleUserIds.contains(c.getUser().getId())
                              && (strategy == null || strategy.canViewCommitment(actor, c)))
                             || matchesOwnedRcdo(c, ownedRcdoIds))
                .toList();
        int filtered = commitments.size() - visible.size();
        if (filtered > 0) {
            log.warn("visibility_denied action=filterVisible userId={} role={} filtered={} of={} reason=outside_role_scope_and_not_rcdo_owner",
                    actor.getId(), actor.getRole(), filtered, commitments.size());
        }
        return visible;
    }

    /**
     * Returns true if the commitment passes both the user-id scope check and the
     * strategy's optional commitment-level predicate.
     */
    private boolean isVisibleByStrategy(AppUser actor, Commitment commitment) {
        if (!computeVisibleUserIds(actor).contains(commitment.getUser().getId())) return false;
        VisibilityStrategy strategy = strategies.get(actor.getRole());
        return strategy == null || strategy.canViewCommitment(actor, commitment);
    }

    /**
     * Compute the set of user IDs that this actor can see based on their role.
     */
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        VisibilityStrategy strategy = strategies.get(actor.getRole());
        if (strategy == null) {
            log.warn("visibility_denied action=computeVisibleUserIds userId={} role={} reason=no_strategy_registered_for_role",
                    actor.getId(), actor.getRole());
            return Set.of(actor.getId()); // fallback: self only
        }
        return strategy.computeVisibleUserIds(actor);
    }

    // --------------- RCDO owner cross-cutting visibility ---------------

    /**
     * Returns true if the actor owns any RCDO (DefiningObjective or Outcome)
     * that the commitment is linked to.
     */
    private boolean isRcdoOwner(AppUser actor, Commitment commitment) {
        Set<UUID> ownedIds = computeOwnedRcdoIds(actor);
        return matchesOwnedRcdo(commitment, ownedIds);
    }

    /**
     * Computes the set of DefiningObjective and Outcome IDs owned by this actor.
     * These are UUIDs from both tables combined — callers use matchesOwnedRcdo()
     * to check whether a commitment's DO or Outcome ID appears in this set.
     */
    private Set<UUID> computeOwnedRcdoIds(AppUser actor) {
        Set<UUID> ownedIds = definingObjectiveRepository
                .findByOwnerIdAndArchivedAtIsNull(actor.getId())
                .stream()
                .map(DefiningObjective::getId)
                .collect(Collectors.toSet());

        outcomeRepository
                .findByOwnerIdAndArchivedAtIsNull(actor.getId())
                .stream()
                .map(Outcome::getId)
                .forEach(ownedIds::add);

        return ownedIds;
    }

    /**
     * Returns true if the commitment is linked to a DefiningObjective or Outcome
     * whose ID is in the ownedRcdoIds set.
     */
    private boolean matchesOwnedRcdo(Commitment c, Set<UUID> ownedRcdoIds) {
        if (c.getDefiningObjective() != null
                && ownedRcdoIds.contains(c.getDefiningObjective().getId())) {
            return true;
        }
        if (c.getOutcome() != null
                && ownedRcdoIds.contains(c.getOutcome().getId())) {
            return true;
        }
        return false;
    }
}
