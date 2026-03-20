package com.compass.platform.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface OutcomeRepository extends JpaRepository<Outcome, UUID> {
    List<Outcome> findByDefiningObjectiveIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID definingObjectiveId);
    List<Outcome> findByOwnerIdAndArchivedAtIsNull(UUID ownerUserId);
    List<Outcome> findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID orgId);
}
