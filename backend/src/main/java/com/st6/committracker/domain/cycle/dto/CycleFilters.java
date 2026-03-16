package com.st6.committracker.domain.cycle.dto;

import com.st6.committracker.domain.CycleState;

import java.time.Instant;

public record CycleFilters(
    CycleState state,
    Instant dateFrom,
    Instant dateTo
) {}
