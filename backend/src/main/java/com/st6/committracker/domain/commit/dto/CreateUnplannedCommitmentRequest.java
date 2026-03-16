package com.st6.committracker.domain.commit.dto;

import com.st6.committracker.domain.CompletionHorizon;
import com.st6.committracker.domain.ReconciliationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateUnplannedCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    @NotNull @Size(min = 2, max = 5) List<String> bullets,
    @NotNull ReconciliationStatus reconciliationStatus,
    String reconciliationNotes
) {}
