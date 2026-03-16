package com.st6.committracker.domain.dashboard.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AlignmentSignalResponse(
    int teamSize,
    Map<String, CategoryDistribution> distribution,
    int unlinkedCount,
    List<MemberAlignment> byTeamMember
) {
    public record CategoryDistribution(int count, double percentage) {}
    public record MemberAlignment(UUID userId, String displayName,
        Map<String, CategoryDistribution> distribution, int unlinkedCount) {}
}
