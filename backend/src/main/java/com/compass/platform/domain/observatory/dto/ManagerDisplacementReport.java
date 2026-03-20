package com.compass.platform.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record ManagerDisplacementReport(
        UUID managerId,
        String managerName,
        int totalDisplacements,
        List<CategoryCount> byCategory,
        List<NoteCluster> clusters
) {}
