package com.compass.platform.domain.reconciliation.dto;

import com.compass.platform.domain.commit.dto.CommitmentResponse;
import com.compass.platform.domain.cycle.dto.CycleResponse;

import java.util.List;

public record ReconciliationViewResponse(
    CycleResponse cycle,
    List<CommitmentReconciliationDetail> commitments,
    ReconciliationSummary summary
) {
    public record CommitmentReconciliationDetail(
        CommitmentResponse commitment,
        ReconciliationResponse reconciliation // null if not yet reconciled
    ) {}
}
