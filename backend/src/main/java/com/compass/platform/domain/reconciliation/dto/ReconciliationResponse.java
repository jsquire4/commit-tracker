package com.compass.platform.domain.reconciliation.dto;

import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.ReconciliationStatus;
import com.compass.platform.domain.commit.dto.CommitmentResponse;

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
    List<CommitmentResponse.TaskBulletResponse> bulletStatuses,
    String displacementCategory,
    String displacementDetail,
    UUID displacingCommitmentId,
    String displacingCommitmentTitle
) {}
