package com.st6.committracker.security;

import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.commit.Commitment;
import com.st6.committracker.domain.rcdo.DefiningObjective;
import com.st6.committracker.domain.rcdo.DefiningObjectiveRepository;
import com.st6.committracker.domain.rcdo.Outcome;
import com.st6.committracker.domain.rcdo.OutcomeRepository;
import com.st6.committracker.domain.user.AppUser;
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
     * Checks role-based visibility first, then falls back to RCDO owner cross-cutting rule.
     */
    public boolean canViewCommitment(AppUser actor, Commitment commitment) {
        if (computeVisibleUserIds(actor).contains(commitment.getUser().getId())) return true;
        return isRcdoOwner(actor, commitment);
    }

    /**
     * Batch filter: pre-compute visible user IDs once, then filter the list.
     * More efficient than calling canViewCommitment() per item.
     */
    public List<Commitment> filterVisible(AppUser actor, List<Commitment> commitments) {
        Set<UUID> visibleUserIds = computeVisibleUserIds(actor);
        Set<UUID> ownedRcdoIds = computeOwnedRcdoIds(actor);
        return commitments.stream()
                .filter(c -> visibleUserIds.contains(c.getUser().getId())
                             || matchesOwnedRcdo(c, ownedRcdoIds))
                .toList();
    }

    /**
     * Compute the set of user IDs that this actor can see based on their role.
     */
    public Set<UUID> computeVisibleUserIds(AppUser actor) {
        VisibilityStrategy strategy = strategies.get(actor.getRole());
        if (strategy == null) return Set.of(actor.getId()); // fallback: self only
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
