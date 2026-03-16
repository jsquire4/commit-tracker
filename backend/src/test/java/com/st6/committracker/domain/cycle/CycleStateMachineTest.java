package com.st6.committracker.domain.cycle;

import com.st6.committracker.domain.CycleState;
import com.st6.committracker.domain.UserRole;
import com.st6.committracker.domain.user.AppUser;
import com.st6.committracker.domain.user.Org;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CycleStateMachine")
class CycleStateMachineTest {

    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------

    /**
     * Reference week: Mon 2025-01-06 00:00 UTC → Sun 2025-01-12 23:59:59 UTC
     * "Current" instant used across tests: 2025-01-08T12:00:00Z (mid-week).
     */
    private static final Instant NOW              = Instant.parse("2025-01-08T12:00:00Z");
    private static final Instant WEEK_START       = Instant.parse("2025-01-06T00:00:00Z");
    private static final Instant WEEK_END         = Instant.parse("2025-01-12T23:59:59Z");
    // A week that is entirely in the past relative to NOW
    private static final Instant PAST_WEEK_START  = Instant.parse("2024-12-30T00:00:00Z");
    private static final Instant PAST_WEEK_END    = Instant.parse("2025-01-05T23:59:59Z");
    // An instant clearly after the reference week ends
    private static final Instant AFTER_WEEK_END   = Instant.parse("2025-01-13T00:00:01Z");

    private CycleStateMachine stateMachine;
    private Org               org;
    private AppUser           employee;
    private AppUser           manager;
    private AppUser           director;

    @BeforeEach
    void setUp() {
        stateMachine = new CycleStateMachine();

        org = new Org(UUID.randomUUID(), "Test Org", "test-org", "UTC", true);

        employee = new AppUser(org, "employee@test.com", "Employee User", UserRole.EMPLOYEE, null);
        manager  = new AppUser(org, "manager@test.com",  "Manager User",  UserRole.MANAGER,  null);
        director = new AppUser(org, "director@test.com", "Director User", UserRole.DIRECTOR, null);
    }

    // Helper: build a cycle with the given state, starts/ends pinned to the reference week.
    private Cycle cycleInState(CycleState state) {
        return Cycle.builder()
                .org(org)
                .label("Test Cycle")
                .state(state)
                .startsAt(WEEK_START)
                .endsAt(WEEK_END)
                .build();
    }

    // Helper: build a TransitionContext with common defaults.
    private CycleStateMachine.TransitionContext ctx(int commitmentCount,
                                                     int reconciled,
                                                     int total,
                                                     Instant now) {
        return new CycleStateMachine.TransitionContext(commitmentCount, reconciled, total, now);
    }

    // =========================================================================
    // DRAFT → LOCKED
    // =========================================================================

    @Test
    @DisplayName("DRAFT→LOCKED succeeds with valid commitments and current week by MANAGER")
    void draftToLocked_succeeds_withValidCommitments() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.LOCKED, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isTrue();
        assertThat(result.rejectionReason()).isNull();
    }

    @Test
    @DisplayName("DRAFT→LOCKED fails with no commitments")
    void draftToLocked_fails_withNoCommitments() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.LOCKED, manager,
                ctx(0, 0, 0, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Cannot lock cycle with no commitments");
    }

    @Test
    @DisplayName("DRAFT→LOCKED fails with past week start (no backdating)")
    void draftToLocked_fails_withPastWeekStart() {
        Cycle pastCycle = Cycle.builder()
                .org(org)
                .label("Past Cycle")
                .state(CycleState.DRAFT)
                .startsAt(PAST_WEEK_START)
                .endsAt(PAST_WEEK_END)
                .build();

        var result = stateMachine.validate(pastCycle, CycleState.LOCKED, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Cannot lock a cycle for a past week");
    }

    @Test
    @DisplayName("DRAFT→LOCKED fails when EMPLOYEE triggers it")
    void draftToLocked_fails_whenEmployeeTriggers() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.LOCKED, employee,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Only managers and above can lock a cycle");
    }

    // =========================================================================
    // LOCKED → RECONCILING
    // =========================================================================

    @Test
    @DisplayName("LOCKED→RECONCILING succeeds after week end by MANAGER")
    void lockedToReconciling_succeeds_afterWeekEnd() {
        Cycle cycle = cycleInState(CycleState.LOCKED);
        var result = stateMachine.validate(cycle, CycleState.RECONCILING, manager,
                ctx(3, 0, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isTrue();
        assertThat(result.rejectionReason()).isNull();
    }

    @Test
    @DisplayName("LOCKED→RECONCILING fails before week end for MANAGER (no override)")
    void lockedToReconciling_fails_beforeWeekEnd_manager() {
        Cycle cycle = cycleInState(CycleState.LOCKED);
        // NOW is mid-week, which is before WEEK_END
        var result = stateMachine.validate(cycle, CycleState.RECONCILING, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo(
                "Cannot begin reconciliation before the week ends (only Directors+ can override)");
    }

    @Test
    @DisplayName("LOCKED→RECONCILING succeeds before week end for DIRECTOR+ (inferred override)")
    void lockedToReconciling_succeeds_beforeWeekEnd_director() {
        Cycle cycle = cycleInState(CycleState.LOCKED);
        // NOW is mid-week — director can override
        var result = stateMachine.validate(cycle, CycleState.RECONCILING, director,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isTrue();
        assertThat(result.rejectionReason()).isNull();
    }

    // =========================================================================
    // RECONCILING → RECONCILED
    // =========================================================================

    @Test
    @DisplayName("RECONCILING→RECONCILED fails with unreconciled commitments")
    void reconcilingToReconciled_fails_withUnreconciledCommitments() {
        Cycle cycle = cycleInState(CycleState.RECONCILING);
        var result = stateMachine.validate(cycle, CycleState.RECONCILED, manager,
                ctx(3, 2, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo(
                "Not all commitments have been reconciled (2 of 3 reconciled)");
    }

    @Test
    @DisplayName("RECONCILING→RECONCILED succeeds when all commitments reconciled by MANAGER")
    void reconcilingToReconciled_succeeds_allReconciled() {
        Cycle cycle = cycleInState(CycleState.RECONCILING);
        var result = stateMachine.validate(cycle, CycleState.RECONCILED, manager,
                ctx(3, 3, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isTrue();
        assertThat(result.rejectionReason()).isNull();
    }

    @Test
    @DisplayName("RECONCILING→RECONCILED fails when EMPLOYEE triggers it")
    void reconcilingToReconciled_fails_whenEmployeeTriggers() {
        Cycle cycle = cycleInState(CycleState.RECONCILING);
        var result = stateMachine.validate(cycle, CycleState.RECONCILED, employee,
                ctx(3, 3, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Only managers and above can complete reconciliation");
    }

    // =========================================================================
    // Invalid transitions (skip / reverse)
    // =========================================================================

    @Test
    @DisplayName("DRAFT→RECONCILING rejected as invalid skip")
    void invalidTransition_draftToReconciling_rejected() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.RECONCILING, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Invalid state transition from DRAFT to RECONCILING");
    }

    @Test
    @DisplayName("DRAFT→RECONCILED rejected as invalid skip")
    void invalidTransition_draftToReconciled_rejected() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.RECONCILED, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Invalid state transition from DRAFT to RECONCILED");
    }

    @Test
    @DisplayName("LOCKED→RECONCILED rejected as invalid skip")
    void invalidTransition_lockedToReconciled_rejected() {
        Cycle cycle = cycleInState(CycleState.LOCKED);
        var result = stateMachine.validate(cycle, CycleState.RECONCILED, manager,
                ctx(3, 0, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Invalid state transition from LOCKED to RECONCILED");
    }

    @Test
    @DisplayName("RECONCILED→DRAFT rejected (terminal state)")
    void invalidTransition_reconciledToAnything_rejected() {
        Cycle cycle = cycleInState(CycleState.RECONCILED);
        var result = stateMachine.validate(cycle, CycleState.DRAFT, manager,
                ctx(3, 3, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("RECONCILED is a terminal state");
    }

    @Test
    @DisplayName("RECONCILED→LOCKED rejected (terminal state)")
    void invalidTransition_reconciledToLocked_rejected() {
        Cycle cycle = cycleInState(CycleState.RECONCILED);
        var result = stateMachine.validate(cycle, CycleState.LOCKED, manager,
                ctx(3, 3, 3, AFTER_WEEK_END));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("RECONCILED is a terminal state");
    }

    // =========================================================================
    // Edge cases
    // =========================================================================

    @Test
    @DisplayName("Same-state transition rejected (DRAFT→DRAFT)")
    void sameStateTransition_rejected() {
        Cycle cycle = cycleInState(CycleState.DRAFT);
        var result = stateMachine.validate(cycle, CycleState.DRAFT, manager,
                ctx(3, 0, 3, NOW));

        assertThat(result.allowed()).isFalse();
        assertThat(result.rejectionReason()).isEqualTo("Invalid state transition from DRAFT to DRAFT");
    }

    @Test
    @DisplayName("Null target state throws IllegalArgumentException")
    void nullTargetState_throws() {
        Cycle cycle = cycleInState(CycleState.DRAFT);

        assertThatThrownBy(() -> stateMachine.validate(cycle, null, manager,
                ctx(3, 0, 3, NOW)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("targetState must not be null");
    }

    @Test
    @DisplayName("validTransitions() returns correct sets for each state")
    void validTransitions_correctForEachState() {
        assertThat(CycleState.DRAFT.validTransitions()).isEqualTo(Set.of(CycleState.LOCKED));
        assertThat(CycleState.LOCKED.validTransitions()).isEqualTo(Set.of(CycleState.RECONCILING));
        assertThat(CycleState.RECONCILING.validTransitions()).isEqualTo(Set.of(CycleState.RECONCILED));
        assertThat(CycleState.RECONCILED.validTransitions()).isEmpty();
    }
}
