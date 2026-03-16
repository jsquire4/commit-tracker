package com.st6.committracker.domain.reconciliation.dto;

import com.st6.committracker.domain.commit.dto.CommitmentResponse;
import com.st6.committracker.domain.cycle.dto.CycleResponse;

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
