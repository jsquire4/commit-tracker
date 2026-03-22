package com.compass.platform.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record ManagerHeatmapRow(
        UUID managerId,
        String managerName,
        String managerRole,
        int teamSize,
        List<WeekCell> weekCells,
        List<PersonHeatmapRow> members
) {}
