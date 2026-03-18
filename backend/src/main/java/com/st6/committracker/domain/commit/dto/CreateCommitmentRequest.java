package com.st6.committracker.domain.commit.dto;

import com.st6.committracker.domain.CompletionHorizon;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateCommitmentRequest(
    @NotNull UUID cycleId,
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID assignedBy,
    @NotNull @Size(min = 2, max = 5) List<@NotBlank @Size(max = 1000) String> bullets,
    @DecimalMin(value = "0.01") @DecimalMax(value = "999.99") BigDecimal estimatedHours
) {}
