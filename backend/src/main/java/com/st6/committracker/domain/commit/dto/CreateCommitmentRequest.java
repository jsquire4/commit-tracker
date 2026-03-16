package com.st6.committracker.domain.commit.dto;

import com.st6.committracker.domain.CompletionHorizon;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID assignedBy,
    @NotNull @Size(min = 2, max = 5) List<String> bullets
) {}
