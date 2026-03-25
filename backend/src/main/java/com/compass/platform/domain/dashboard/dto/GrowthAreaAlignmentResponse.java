package com.compass.platform.domain.dashboard.dto;

import java.util.List;
import java.util.UUID;

/**
 * Growth area alignment stats for the team dashboard.
 * Shows what percentage of commitments are aligned to at least one personal growth area.
 */
public record GrowthAreaAlignmentResponse(
    int totalCommitments,
    int alignedCount,
    double alignedPercentage,
    List<MemberGrowthAlignment> byTeamMember
) {
    public record MemberGrowthAlignment(
        UUID userId,
        String displayName,
        int totalCommitments,
        int alignedCount,
        double alignedPercentage
    ) {}
}
