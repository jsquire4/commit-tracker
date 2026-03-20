package com.compass.platform.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DefiningObjectiveRepository extends JpaRepository<DefiningObjective, UUID> {
    List<DefiningObjective> findByRallyCryIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID rallyCryId);
    List<DefiningObjective> findByOwnerIdAndArchivedAtIsNull(UUID ownerUserId);
    List<DefiningObjective> findByOrgIdAndArchivedAtIsNull(UUID orgId);
    List<DefiningObjective> findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID orgId);
}
