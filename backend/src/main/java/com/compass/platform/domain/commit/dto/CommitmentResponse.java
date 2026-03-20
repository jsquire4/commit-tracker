package com.compass.platform.domain.commit.dto;

import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;
import com.compass.platform.domain.ReconciliationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CommitmentResponse(
    UUID id,
    UUID cycleId,
    UUID userId,
    String userDisplayName,
    String title,
    String description,
    CompletionHorizon completionHorizon,
    CompletionDay completionDay,
    CompletionTimeBlock completionTimeBlock,
    int priorityRank,
    UUID chessCategoryId,
    String chessCategoryName,
    RcdoLinkResponse rcdoLink,
    AssignmentAttributionResponse attribution,
    List<TaskBulletResponse> bullets,
    UUID carriedFromCommitmentId,
    boolean isUnplanned,
    BigDecimal estimatedHours,
    ReconciliationStatus reconciliationStatus,
    String reconciliationNote,
    Instant createdAt,
    Instant updatedAt
) {
    public record RcdoLinkResponse(UUID rallyCryId, String rallyCryTitle,
        UUID definingObjectiveId, String definingObjectiveTitle,
        UUID outcomeId, String outcomeTitle) {}
    public record TaskBulletResponse(UUID id, String body, int sortOrder, boolean completed) {}
    public record AssignmentAttributionResponse(String kind, UUID assignedById, String assignedByName) {}
}
