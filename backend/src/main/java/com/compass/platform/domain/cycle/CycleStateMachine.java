package com.compass.platform.domain.cycle;

import com.compass.platform.domain.CycleState;
import com.compass.platform.domain.UserRole;
import com.compass.platform.domain.user.AppUser;

import java.time.Instant;

/**
 * Pure utility class — no Spring annotations. Instantiate directly.
 *
 * Encapsulates all lifecycle transition rules for a {@link Cycle}.
 */
public class CycleStateMachine {

    // -------------------------------------------------------------------------
    // Nested records
    // -------------------------------------------------------------------------

    public record TransitionResult(boolean allowed, String rejectionReason) {

        public static TransitionResult permit() {
            return new TransitionResult(true, null);
        }

        public static TransitionResult rejected(String reason) {
            return new TransitionResult(false, reason);
        }
    }

    public record TransitionContext(
            int commitmentCount,
            int reconciledCommitmentCount,
            int totalCommitmentsInCycle,
            Instant now,
            String orgTimezone
    ) {}

    // -------------------------------------------------------------------------
    // Public entry point
    // -------------------------------------------------------------------------

    /**
     * Validates whether a transition from {@code cycle.getState()} to {@code targetState}
     * is permitted for the given {@code actor} under the supplied {@code context}.
     *
     * @throws IllegalArgumentException if {@code targetState} is {@code null}
     */
    public TransitionResult validate(Cycle cycle, CycleState targetState, AppUser actor, TransitionContext context) {
        if (targetState == null) {
            throw new IllegalArgumentException("targetState must not be null");
        }

        CycleState current = cycle.getState();

        return switch (current) {
            case DRAFT -> targetState == CycleState.LOCKED
                    ? validateLock(cycle, actor, context)
                    : TransitionResult.rejected("Invalid state transition from " + current + " to " + targetState);

            case LOCKED -> targetState == CycleState.RECONCILING
                    ? validateStartReconciliation(cycle, actor, context)
                    : TransitionResult.rejected("Invalid state transition from " + current + " to " + targetState);

            case RECONCILING -> targetState == CycleState.RECONCILED
                    ? validateCompleteReconciliation(cycle, actor, context)
                    : TransitionResult.rejected("Invalid state transition from " + current + " to " + targetState);

            case RECONCILED ->
                    TransitionResult.rejected("RECONCILED is a terminal state");
        };
    }

    // -------------------------------------------------------------------------
    // Internal validation methods — package-private for testability
    // -------------------------------------------------------------------------

    /**
     * Rule 1: DRAFT → LOCKED
     * <ul>
     *   <li>At least one commitment must exist.</li>
     *   <li>Actor must be MANAGER or above.</li>
     * </ul>
     *
     * Note: date-based validation (past-week check) was intentionally removed.
     * The state machine enforces state transitions, not calendar constraints.
     * Locking a cycle for a past week is valid (e.g., seed data, late entry).
     */
    TransitionResult validateLock(Cycle cycle, AppUser actor, TransitionContext context) {
        if (context.commitmentCount() < 1) {
            return TransitionResult.rejected("Cannot lock cycle with no commitments");
        }

        if (!isManagerOrAbove(actor)) {
            return TransitionResult.rejected("Only managers and above can lock a cycle");
        }

        return TransitionResult.permit();
    }

    /**
     * Rule 2: LOCKED → RECONCILING
     * <ul>
     *   <li>Either {@code now} is after the cycle's end, OR the actor is DIRECTOR+.</li>
     *   <li>Actor must be MANAGER or above.</li>
     * </ul>
     */
    TransitionResult validateStartReconciliation(Cycle cycle, AppUser actor, TransitionContext context) {
        boolean weekEnded = context.now().isAfter(cycle.getEndsAt());
        boolean isDirectorOrAbove = isDirectorOrAbove(actor);

        if (!weekEnded && !isDirectorOrAbove) {
            return TransitionResult.rejected(
                    "Cannot begin reconciliation before the week ends (only Directors+ can override)");
        }

        if (!isManagerOrAbove(actor)) {
            return TransitionResult.rejected("Only managers and above can start reconciliation");
        }

        return TransitionResult.permit();
    }

    /**
     * Rule 3: RECONCILING → RECONCILED
     * <ul>
     *   <li>All commitments in the cycle must have been reconciled.</li>
     *   <li>Actor must be MANAGER or above.</li>
     * </ul>
     */
    TransitionResult validateCompleteReconciliation(Cycle cycle, AppUser actor, TransitionContext context) {
        if (context.reconciledCommitmentCount() != context.totalCommitmentsInCycle()) {
            return TransitionResult.rejected(
                    "Not all commitments have been reconciled ("
                    + context.reconciledCommitmentCount()
                    + " of "
                    + context.totalCommitmentsInCycle()
                    + " reconciled)");
        }

        if (!isManagerOrAbove(actor)) {
            return TransitionResult.rejected("Only managers and above can complete reconciliation");
        }

        return TransitionResult.permit();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private boolean isManagerOrAbove(AppUser actor) {
        return switch (actor.getRole()) {
            case MANAGER, DIRECTOR, VP, EXECUTIVE -> true;
            default -> false;
        };
    }

    private boolean isDirectorOrAbove(AppUser actor) {
        return switch (actor.getRole()) {
            case DIRECTOR, VP, EXECUTIVE -> true;
            default -> false;
        };
    }

}
