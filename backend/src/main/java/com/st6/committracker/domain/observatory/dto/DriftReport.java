package com.st6.committracker.domain.observatory.dto;

import java.time.Instant;
import java.util.List;

public record DriftReport(
        List<DriftSignal> signals,
        Instant generatedAt
) {}
