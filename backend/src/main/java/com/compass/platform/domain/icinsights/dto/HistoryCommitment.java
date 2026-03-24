package com.compass.platform.domain.icinsights.dto;

import java.util.List;
import java.util.UUID;

public record HistoryCommitment(
        UUID id,
        String title,
        String reconciliationStatus,
        String rallyCryTitle,
        String chessCategoryName,
        List<String> growthAreaLabels,
        boolean isUnplanned,
        String assignedByName
) {}
