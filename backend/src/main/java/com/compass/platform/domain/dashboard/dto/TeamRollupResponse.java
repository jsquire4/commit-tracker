package com.compass.platform.domain.dashboard.dto;

import com.compass.platform.domain.CycleState;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TeamRollupResponse(
    List<TeamMemberSummary> members
) {
    public record TeamMemberSummary(
        UUID userId,
        String displayName,
        String role,
        int totalCommitments,
        CycleState cycleState,
        int reconciledCount,
        /** Count of COMPLETED + PARTIALLY_COMPLETED reconciliation records for this member. */
        int completedCount,
        Map<String, Integer> categoryBreakdown
    ) {}
}
