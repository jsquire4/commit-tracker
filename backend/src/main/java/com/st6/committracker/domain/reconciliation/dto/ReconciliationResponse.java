package com.st6.committracker.domain.reconciliation.dto;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.ReconciliationStatus;
import com.st6.committracker.domain.commit.dto.CommitmentResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ReconciliationResponse(
    UUID id,
    UUID commitmentId,
    UUID cycleId,
    ReconciliationStatus status,
    String notes,
    CompletionHorizon plannedHorizon,
    Instant reconciledAt,
    UUID reconciledByUserId,
    List<CommitmentResponse.TaskBulletResponse> bulletStatuses
) {}
