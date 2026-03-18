package com.st6.committracker.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record PortcoTrendLine(
        UUID orgId,
        String orgName,
        List<AlignmentDataPoint> dataPoints
) {}
