package com.compass.platform.domain.commit.dto;

import com.compass.platform.domain.CompletionDay;
import com.compass.platform.domain.CompletionHorizon;
import com.compass.platform.domain.CompletionTimeBlock;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record UpdateCommitmentRequest(
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    @NotNull CompletionHorizon completionHorizon,
    CompletionDay completionDay,
    CompletionTimeBlock completionTimeBlock,
    UUID chessCategoryId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID assignedBy,
    @NotNull @Size(min = 2, max = 5) List<@NotBlank @Size(max = 1000) String> bullets,
    @DecimalMin(value = "0.01") @DecimalMax(value = "999.99") BigDecimal estimatedHours
) {}
