package com.st6.committracker.domain.dashboard.dto;

import com.st6.committracker.domain.CycleState;

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
        Map<String, Integer> categoryBreakdown
    ) {}
}
