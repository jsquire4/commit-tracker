package com.compass.platform.domain.observatory.dto;

import java.util.List;

public record ProgramHeatmapResponse(
        List<ManagerHeatmapRow> managers
) {}
