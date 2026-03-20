package com.compass.platform.domain.commit.dto;

import java.util.UUID;

public record CommitmentFilters(
    UUID userId,
    UUID rallyCryId,
    UUID definingObjectiveId,
    UUID outcomeId,
    UUID chessCategoryId,
    UUID assignedBy
) {}
