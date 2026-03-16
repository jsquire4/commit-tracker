package com.st6.committracker.domain.rcdo;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RallyCryRepository extends JpaRepository<RallyCry, UUID> {
    List<RallyCry> findByOrgIdAndArchivedAtIsNullOrderBySortOrderAsc(UUID orgId);
    List<RallyCry> findByOrgIdOrderBySortOrderAsc(UUID orgId);
}
