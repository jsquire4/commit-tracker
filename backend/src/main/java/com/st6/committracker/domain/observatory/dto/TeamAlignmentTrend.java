package com.st6.committracker.domain.observatory.dto;

import java.util.List;
import java.util.UUID;

public record TeamAlignmentTrend(
        UUID managerId,
        String managerName,
        String role,
        int teamSize,
        List<AlignmentDataPoint> dataPoints
) {}
