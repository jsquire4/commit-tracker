package com.st6.committracker.domain.reconciliation.dto;

import com.st6.committracker.domain.ReconciliationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Reconciliation request for a single commitment.
 * Bean Validation handles field-level constraints. The cross-field rule
 * (completionNotes required when status != COMPLETED) is enforced in
 * ReconciliationService.reconcileCommitment() — not via a custom validator —
 * because it's business logic, not a format constraint.
 */
public record ReconcileRequest(
    @NotNull ReconciliationStatus status,
    @Size(max = 2000) String completionNotes,
    boolean carryForward,
    List<BulletStatusUpdate> bulletStatuses
) {
    public record BulletStatusUpdate(UUID bulletId, boolean done) {}
}
