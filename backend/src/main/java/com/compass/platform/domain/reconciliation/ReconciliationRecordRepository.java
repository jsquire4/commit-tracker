package com.compass.platform.domain.reconciliation;

import com.compass.platform.domain.ReconciliationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReconciliationRecordRepository extends JpaRepository<ReconciliationRecord, UUID> {
    Optional<ReconciliationRecord> findByCommitmentIdAndCycleId(UUID commitmentId, UUID cycleId);
    List<ReconciliationRecord> findByOrgIdAndCycleId(UUID orgId, UUID cycleId);
    List<ReconciliationRecord> findByCommitmentIdIn(Collection<UUID> commitmentIds);
    List<ReconciliationRecord> findByOrgIdAndCycleIdIn(UUID orgId, Collection<UUID> cycleIds);
    long countByOrgIdAndCycleIdAndStatus(UUID orgId, UUID cycleId, ReconciliationStatus status);

    @Query("SELECT r.status, COUNT(r) FROM ReconciliationRecord r WHERE r.org.id = :orgId AND r.cycle.id = :cycleId GROUP BY r.status")
    List<Object[]> countByOrgIdAndCycleIdGroupByStatus(@Param("orgId") UUID orgId, @Param("cycleId") UUID cycleId);
}
