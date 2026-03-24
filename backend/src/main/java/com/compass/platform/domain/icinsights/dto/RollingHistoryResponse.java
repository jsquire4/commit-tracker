package com.compass.platform.domain.icinsights.dto;

import java.util.List;

public record RollingHistoryResponse(
        List<WeekGroup> weeks
) {}
