package com.compass.platform.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record PersonHeatmapRow(
        UUID userId,
        String displayName,
        List<WeekCell> weekCells
) {}
