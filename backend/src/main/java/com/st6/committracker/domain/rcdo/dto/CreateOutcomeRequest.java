package com.st6.committracker.domain.rcdo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateOutcomeRequest(
    @NotNull UUID definingObjectiveId,
    @NotBlank @Size(max = 500) String title,
    @Size(max = 2000) String description,
    UUID ownerUserId
) {}
