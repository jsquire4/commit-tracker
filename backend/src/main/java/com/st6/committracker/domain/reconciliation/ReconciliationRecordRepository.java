package com.st6.committracker.domain.reconciliation;

import com.st6.committracker.domain.ReconciliationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReconciliationRecordRepository extends JpaRepository<ReconciliationRecord, UUID> {
    Optional<ReconciliationRecord> findByCommitmentIdAndCycleId(UUID commitmentId, UUID cycleId);
    List<ReconciliationRecord> findByOrgIdAndCycleId(UUID orgId, UUID cycleId);
    long countByOrgIdAndCycleIdAndStatus(UUID orgId, UUID cycleId, ReconciliationStatus status);
}
