package com.compass.platform.domain.commit.dto;

import java.util.List;
import java.util.UUID;

/**
 * Paginated slice of a commitment chain, newest-first within {@code nodes}.
 */
public record CommitmentLineageResponse(
        List<CommitmentLineageNode> nodes,
        boolean hasMore,
        UUID nextCursor
) {}
