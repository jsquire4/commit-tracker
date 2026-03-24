package com.compass.platform.domain.commit.dto;

import com.compass.platform.domain.ReconciliationStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * One snapshot along a commitment chain (one row per week / cycle).
 */
public record CommitmentLineageNode(
        UUID commitmentId,
        UUID cycleId,
        String cycleLabel,
        Instant startsAt,
        Instant endsAt,
        String title,
        String description,
        List<CommitmentResponse.TaskBulletResponse> bullets,
        UUID userId,
        String userDisplayName,
        ReconciliationStatus reconciliationStatus,
        String reconciliationNote
) {}
