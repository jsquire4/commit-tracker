package com.compass.platform.domain.cycle.dto;

import com.compass.platform.domain.CycleState;

import java.time.Instant;

public record CycleFilters(
    CycleState state,
    Instant dateFrom,
    Instant dateTo
) {}
